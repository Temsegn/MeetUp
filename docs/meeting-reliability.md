# Meeting reliability, handover, and persistent admission

## What was wrong

1. Any Socket.IO disconnect immediately hard-cleaned the mediasoup peer (`peer-left`).
2. Client reconnect ran full `leaveMeeting` + `joinMeeting`, so guests hit the waiting room again.
3. Admission lived only in an in-memory waiting map — never persisted.
4. Guest JWTs mint a new `guest_*` id every auth, so identity could not be remembered by userId alone.
5. Kick did not block rejoin.

## What we changed

### Soft disconnect (45s grace)

On unexpected socket disconnect the server schedules cleanup instead of removing the peer immediately, and emits `peer-reconnecting`. If the same identity rejoins within the grace window, the old media peer is replaced and `peer-reconnected` is emitted. Explicit **Leave** still cleans up immediately.

### Persistent admission (`MeetingAdmission`)

Keyed by:

- `user:<userId>` for members
- `email:<normalizedEmail>` for guests

Statuses: `admitted` | `kicked` | `denied`.

- Host admit → `admitted`
- Auto-join (no waiting room / host) → `admitted`
- Kick → `kicked` (blocks rejoin)
- Deny waiting → `denied`

Reconnect / refresh / network handover reuses admission and skips the waiting room when status is `admitted`.

### Client recovery

- Socket.IO: more reconnect attempts + jittered backoff
- Stay on the meeting page with a **Reconnecting…** banner while auto-recovery runs
- Soft media rebuild (no intentional leave) after signaling recovers — Socket.IO alone is not enough
- Send/recv ICE failure after restart budget also triggers the same rebuild (Wi‑Fi↔mobile)
- Same-socket `join-room` replaces the old mediasoup peer (no `ALREADY_JOINED` dead-end)
- Identity-keyed peer replace (`email:` / `user:`) so reconnect never duplicates the roster
- Bounded automatic media recovery (5 attempts, exponential backoff + jitter)
- If auto-recovery fails: **Connection lost. You can rejoin the meeting.** + **Rejoin meeting** button
- Manual Rejoin revalidates authorization server-side; previously admitted users skip waiting room
- Mute / camera-off preferences are re-applied when local tracks are republished
- Invite guests: `join-status?email=` returns `previousDisplayName` / `previouslyAdmitted` so returning guests skip the name prompt and auto-join
- `online` / `offline` treated as hints, not meeting-ended
- Auth denial / meeting-ended show an error without a Rejoin button

## Manual test checklist

1. Two browsers in a meeting; turn Wi-Fi off ~10s then on — stay on page, recover media, no second admit.
2. Guest admitted → refresh → rejoins without waiting (same invite email).
3. Host kicks guest → guest cannot rejoin (kicked).
4. Host Leave vs close tab briefly — Leave removes immediately; brief tab sleep should soft-recover.
5. Host ends meeting while someone is reconnecting — everyone gets meeting-ended.

## Limits (honest)

- Media cannot continue through a total outage; recovery rebuilds transports when the network returns.
- Backend restart still drops live mediasoup objects; membership/admission survive and clients must rejoin media.
- Meeting lock / join-before-host enforcement is still not fully implemented as a separate control.
