<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RfidCard;
use App\Models\ScanEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ScanController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'uid' => ['required', 'string', 'max:255'],
            'scanned_at' => ['nullable', 'date'],
            'source' => ['nullable', 'string', 'max:255'],
            'target_field' => ['nullable', 'string', 'max:255'],
        ]);

        $uid = strtoupper(trim($validated['uid']));
        $scannedAt = isset($validated['scanned_at'])
            ? Carbon::parse($validated['scanned_at'])
            : now();

        $eventId = DB::transaction(function () use ($uid, $scannedAt, $validated) {
            $card = RfidCard::query()->where('uid', $uid)->lockForUpdate()->first();

            if ($card) {
                $card->last_seen_at = $scannedAt;
                $card->total_scans = $card->total_scans + 1;
                $card->save();
            } else {
                $card = RfidCard::query()->create([
                    'uid' => $uid,
                    'first_seen_at' => $scannedAt,
                    'last_seen_at' => $scannedAt,
                    'total_scans' => 1,
                ]);
            }

            $event = ScanEvent::query()->create([
                'card_id' => $card->id,
                'scanned_at' => $scannedAt,
                'source' => $validated['source'] ?? 'web-serial',
                'target_field' => $validated['target_field'] ?? null,
            ]);

            return $event->id;
        });

        return response()->json([
            'ok' => true,
            'event_id' => $eventId,
            'uid' => $uid,
        ], 201);
    }

    public function scans(): JsonResponse
    {
        $items = ScanEvent::query()
            ->select('scan_events.id', 'rfid_cards.uid', 'scan_events.scanned_at', 'scan_events.source', 'scan_events.target_field')
            ->join('rfid_cards', 'rfid_cards.id', '=', 'scan_events.card_id')
            ->orderByDesc('scan_events.id')
            ->limit(100)
            ->get();

        return response()->json([
            'items' => $items,
            'count' => $items->count(),
        ]);
    }

    public function cards(): JsonResponse
    {
        $items = RfidCard::query()
            ->select('uid', 'first_seen_at', 'last_seen_at', 'total_scans')
            ->orderByDesc('last_seen_at')
            ->limit(100)
            ->get();

        return response()->json([
            'items' => $items,
            'count' => $items->count(),
        ]);
    }

    public function lookup(Request $request): JsonResponse
    {
        $uid = strtoupper(trim((string) $request->query('uid', '')));

        if ($uid === '') {
            return response()->json(['found' => false]);
        }

        $card = RfidCard::query()->where('uid', $uid)->first();

        if (! $card) {
            return response()->json(['found' => false, 'uid' => $uid]);
        }

        $lastScan = ScanEvent::query()
            ->where('card_id', $card->id)
            ->whereNotNull('target_field')
            ->latest('scanned_at')
            ->first();

        return response()->json([
            'found' => true,
            'uid' => $card->uid,
            'total_scans' => $card->total_scans,
            'first_seen_at' => $card->first_seen_at,
            'last_seen_at' => $card->last_seen_at,
            'last_target_field' => $lastScan?->target_field,
        ]);
    }

    public function health(): JsonResponse
    {
        DB::select('SELECT 1');

        return response()->json([
            'ok' => true,
            'db' => 'connected',
        ]);
    }

    public function safetyDb(): JsonResponse
    {
        $fkEnabledRow = DB::selectOne('SELECT @@FOREIGN_KEY_CHECKS AS fk_enabled');
        $orphanRow = DB::selectOne(
            'SELECT COUNT(*) AS orphan_events
             FROM scan_events se
             LEFT JOIN rfid_cards rc ON rc.id = se.card_id
             WHERE rc.id IS NULL'
        );
        $duplicateUidRows = DB::select(
            'SELECT uid, COUNT(*) AS dup_count
             FROM rfid_cards
             GROUP BY uid
             HAVING COUNT(*) > 1'
        );

        $fkEnabled = (int) (($fkEnabledRow->fk_enabled ?? 0)) === 1;
        $orphanEvents = (int) (($orphanRow->orphan_events ?? 0));

        return response()->json([
            'engine' => 'mysql',
            'foreign_keys_enabled' => $fkEnabled,
            'orphan_events' => $orphanEvents,
            'duplicate_uids' => $duplicateUidRows,
            'is_safe' => $fkEnabled && $orphanEvents === 0 && count($duplicateUidRows) === 0,
        ]);
    }
}
