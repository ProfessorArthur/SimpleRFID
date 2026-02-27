const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const tagContainer = document.getElementById("tagContainer");
const tagCountEl = document.getElementById("tagCount");
const clearBtn = document.getElementById("clearBtn");
const scanInput = document.getElementById("scanInput");
const scanConfirmation = document.getElementById("scanConfirmation");

let port = null;
let reader = null;
let tags = []; // { uid, count, lastSeen }
let scanAnimTimer = null;
let lastFocusedWritableField = null;
let focusedFieldClearTimer = null;

// ---- Configurable timings (edit these to change behavior) ----
const BEEP_FREQUENCY = 1500; // Hz
const BEEP_DURATION_MS = 120; // ms
const TYPE_DELAY_MS = 10; // ms per character when typing UID
const POST_TYPE_PAUSE_MS = 600; // ms to wait after typing before confirmation
const CONFIRM_DISPLAY_MS = 500; // ms to display the "scanned" confirmation
const FOCUSED_FIELD_CLEAR_MS = 1000; // ms before clearing scanned UID from focused form field
const API_BASE_URL =
  window.APP_CONFIG?.apiBaseUrl !== undefined
    ? window.APP_CONFIG.apiBaseUrl
    : "http://127.0.0.1:8000";
// ---------------------------------------------------------------
// Create beep sound using Web Audio API
function playBeep(frequency = 1500, duration = 150) {
  try {
    const ctx = new (window.AudioContext || window.AudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = frequency;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    /* audio not available */
  }
}

connectBtn.addEventListener("click", async () => {
  if (port) {
    await disconnect();
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    setStatus("ok", "Connected — Waiting for tags…");
    connectBtn.textContent = "Disconnect";
    connectBtn.classList.add("connected");

    readLoop();
  } catch (err) {
    if (err.name !== "NotFoundError") {
      setStatus("error", getConnectionErrorMessage(err));
    }
    port = null;
  }
});

clearBtn.addEventListener("click", () => {
  tags = [];
  renderTags();
});

async function disconnect() {
  try {
    if (reader) {
      await reader.cancel();
      reader = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
  } catch (e) {
    /* ignore */
  }

  connectBtn.textContent = "Connect to Reader";
  connectBtn.classList.remove("connected");
  setStatus("waiting", "Disconnected");
}

async function readLoop() {
  const decoder = new TextDecoderStream();
  const inputDone = port.readable.pipeTo(decoder.writable);
  const inputStream = decoder.readable;
  reader = inputStream.getReader();

  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        parseLine(line.trim());
      }
    }
  } catch (err) {
    if (err.name !== "TypeError") {
      setStatus("error", "Read error: " + err.message);
    }
  } finally {
    reader.releaseLock();
    reader = null;
  }
}

function parseLine(line) {
  // Match lines like: "Tag Detected! ID: A1 B2 C3 D4"
  const match = line.match(/Tag Detected!\s*ID:\s*([0-9A-Fa-f\s]+)/);
  if (!match) return;

  const uid = match[1].trim().toUpperCase();
  const now = new Date();

  writeUidToFocusedField(uid);

  // Barcode-like scan animation
  animateScanInput(uid, now);
}

function animateScanInput(uid, now) {
  // Cancel any in-progress animation
  if (scanAnimTimer) {
    clearTimeout(scanAnimTimer);
    scanAnimTimer = null;
  }

  scanInput.value = "";
  scanInput.classList.add("scanning");
  scanConfirmation.classList.add("hidden");
  scanConfirmation.classList.remove("show");

  // Typewriter effect: type UID character by character
  const chars = uid.split("");
  let i = 0;

  function typeNext() {
    if (i < chars.length) {
      scanInput.value += chars[i];
      i++;
      scanAnimTimer = setTimeout(typeNext, TYPE_DELAY_MS);
    } else {
      // Typing complete — beep
      playBeep(BEEP_FREQUENCY, BEEP_DURATION_MS);

      // Brief pause to show the full UID
      scanAnimTimer = setTimeout(() => {
        // Show confirmation
        scanConfirmation.textContent = "✓ Scanned successfully";
        scanConfirmation.classList.remove("hidden");
        scanConfirmation.classList.add("show");

        // Clear the input text
        scanInput.value = "";
        scanInput.classList.remove("scanning");

        // Record the tag
        recordTag(uid, now);

        // Hide confirmation after a moment
        scanAnimTimer = setTimeout(() => {
          scanConfirmation.classList.remove("show");
          scanConfirmation.classList.add("hidden");
          scanInput.placeholder = "Waiting for scan…";
        }, CONFIRM_DISPLAY_MS);
      }, POST_TYPE_PAUSE_MS);
    }
  }

  scanInput.placeholder = "";
  typeNext();
}

function recordTag(uid, now) {
  // Check if tag already seen
  const existing = tags.find((t) => t.uid === uid);
  if (existing) {
    existing.count++;
    existing.lastSeen = now;
  } else {
    tags.unshift({ uid, count: 1, lastSeen: now });
  }

  // Sort: most recent first
  tags.sort((a, b) => b.lastSeen - a.lastSeen);

  saveScanToDatabase(uid, now, getFocusedFieldName());

  setStatus("ok", `Tag read: ${uid}`);
  renderTags();
}

function isWritableField(el) {
  if (!el) return false;
  if (el.matches("input, textarea")) {
    return !el.readOnly && !el.disabled;
  }
  return el.isContentEditable === true;
}

function writeUidToFocusedField(uid) {
  const activeEl = document.activeElement;
  const target = isWritableField(activeEl)
    ? activeEl
    : isWritableField(lastFocusedWritableField)
      ? lastFocusedWritableField
      : null;

  if (!target) {
    return;
  }

  if (target.matches("input, textarea")) {
    target.value = uid;
    const caretPos = uid.length;
    target.setSelectionRange(caretPos, caretPos);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    queueFocusedFieldClear(target, uid);
    return;
  }

  if (target.isContentEditable) {
    target.textContent = uid;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    queueFocusedFieldClear(target, uid);
  }
}

function queueFocusedFieldClear(target, scannedUid) {
  if (focusedFieldClearTimer) {
    clearTimeout(focusedFieldClearTimer);
    focusedFieldClearTimer = null;
  }

  focusedFieldClearTimer = setTimeout(() => {
    if (!isWritableField(target)) {
      return;
    }

    if (target.matches("input, textarea")) {
      if (target.value === scannedUid) {
        target.value = "";
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    if (target.isContentEditable && target.textContent === scannedUid) {
      target.textContent = "";
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, FOCUSED_FIELD_CLEAR_MS);
}

function getFocusedFieldName() {
  const activeEl = document.activeElement;
  const target = isWritableField(activeEl)
    ? activeEl
    : isWritableField(lastFocusedWritableField)
      ? lastFocusedWritableField
      : null;

  if (!target) return null;
  return target.id || target.name || target.getAttribute("aria-label") || null;
}

async function saveScanToDatabase(uid, now, targetField) {
  try {
    await fetch(`${API_BASE_URL}/api/scans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        scanned_at: now.toISOString(),
        source: "web-serial",
        target_field: targetField,
      }),
    });
  } catch (error) {
    // Keep UI functional even when API server is offline.
  }
}

function renderTags() {
  if (tags.length === 0) {
    tagContainer.innerHTML = `
          <div class="empty-state">
            <div class="icon">📡</div>
            Connect your reader and scan an RFID tag to begin.
          </div>`;
    tagCountEl.textContent = "";
    clearBtn.style.display = "none";
    return;
  }

  tagCountEl.textContent = `(${tags.length} unique)`;
  clearBtn.style.display = "inline-block";

  tagContainer.innerHTML = tags
    .map(
      (tag) => `
        <div class="tag-card">
          <div>
            <span class="tag-uid">${tag.uid}</span>
            ${tag.count > 1 ? `<span class="tag-count">×${tag.count}</span>` : ""}
          </div>
          <span class="tag-time">${formatTime(tag.lastSeen)}</span>
        </div>
      `,
    )
    .join("");
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setStatus(type, message) {
  statusEl.className = type;
  const pulseClass =
    type === "ok" ? "green" : type === "waiting" ? "yellow" : "red";
  statusEl.innerHTML = `<span class="pulse ${pulseClass}"></span> ${message}`;
}

function getConnectionErrorMessage(err) {
  const rawMessage = String(err?.message || "");
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes("failed to open serial port") ||
    lower.includes("access denied") ||
    lower.includes("device busy")
  ) {
    return "Connection failed: port is busy. Close Arduino Serial Monitor/IDE or PLX-DAQ, unplug/replug USB, then reconnect.";
  }

  if (lower.includes("networkerror") || lower.includes("disconnected")) {
    return "Connection failed: reader disconnected. Reconnect USB and try again.";
  }

  return "Connection failed: " + rawMessage;
}

document.addEventListener("focusin", (event) => {
  if (isWritableField(event.target)) {
    lastFocusedWritableField = event.target;
  }
});
