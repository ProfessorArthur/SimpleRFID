const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const tagContainer = document.getElementById("tagContainer");
const tagCountEl = document.getElementById("tagCount");
const clearBtn = document.getElementById("clearBtn");

let port = null;
let reader = null;
let tags = []; // { uid, count, lastSeen }

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
      setStatus("error", "Connection failed: " + err.message);
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

  setStatus("ok", `Tag read: ${uid}`);
  renderTags();
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
