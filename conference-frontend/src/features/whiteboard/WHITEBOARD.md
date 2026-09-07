# Collaborative Whiteboard (Excalidraw)

## Architecture

```text
MeetUp Live Meeting
  └── WhiteboardStage (UI)
        └── Excalidraw
        └── useWhiteboardCollaboration
              └── whiteboardSocketAdapter
                    └── existing JWT Socket.IO meeting socket
                          └── whiteboard.gateway (server)
                                ├── authz (socket.data.currentRoom)
                                ├── room service (in-memory scene + revision)
                                └── WhiteboardRepository → MongoDB
```

Identity: one whiteboard per meeting `roomId` (`whiteboardId === roomId`).

## Client

| Piece | Role |
|-------|------|
| `WhiteboardStage` | Mounts Excalidraw, close button, `data-meeting-whiteboard` for recording |
| `useWhiteboardCollaboration` | Join/sync/diff/batch; keeps scene updates off React state |
| `useWhiteboardVisibility` | Shared open/close panel (opener-only close) |
| `whiteboardSocketAdapter` | Typed Socket.IO emit/on for whiteboard events |
| `sceneMerge` | Element version merge + local diff |

## Server

| Piece | Role |
|-------|------|
| `whiteboard.gateway` | Join/update/cursor/clear/visibility; rate limits; payload size |
| `whiteboard-room.service` | In-memory rooms, server revision, debounce persist |
| `whiteboard-scene.service` | Deterministic merge by `version` / `versionNonce` |
| `whiteboard.repository` | Mongo `WhiteboardDocument` load/save |
| `whiteboard-authz` | Requires `socket.data.currentRoom.roomId` match |
| `whiteboard-visibility` | Who opened the shared panel |

## Socket.IO events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `whiteboard:join` | C→S | Authorize + return full snapshot |
| `whiteboard:leave` | C→S | Detach collaboration session |
| `whiteboard:update` | C→S | Partial element/file changes |
| `whiteboard:sync` | S→C | Applied partial update + revision |
| `whiteboard:cursor` | both | Throttled presence (not persisted) |
| `whiteboard:clear` | C→S | Soft-delete all elements (in-room only) |
| `whiteboard:error` | S→C | Structured errors |
| `whiteboard:visibility` | both | Panel open/close broadcast |
| `whiteboard:get-visibility` | C→S | Late joiner panel state |

## Synchronization model

1. Clients send **changed elements only** (diff by `id`/`version`/`versionNonce`), batched ~80ms.
2. Server merges with deterministic rules (higher version wins; same version → higher `versionNonce`).
3. Server increments a monotonic `revision` and broadcasts `whiteboard:sync` to the meeting room.
4. Joiners receive a **full snapshot** — no history replay.
5. Local Excalidraw undo/redo is **per-user** (does not undo peers' strokes). Collaborative undo is not global.

## Persistence

- Collection: `WhiteboardDocument` (`roomId`, `revision`, `elements`, `files`)
- Debounced save (~2s) after scene changes; flush on last peer leave
- Cursors are never persisted
- Old tldraw state is incompatible and was in-memory only — no migration of board content

## Authorization

- Socket JWT auth (existing middleware) required to connect
- Whiteboard join/update requires meeting membership via `socket.data.currentRoom`
- Panel close: only the opener (unchanged UX)
- Clear: any in-room peer who has joined the whiteboard (same edit model as draw)

## Reconnection

On remount / socket reconnect, client re-emits `whiteboard:join` and replaces local scene from the server snapshot.

## Performance

- Partial updates, not full-scene on every pointer move
- Update rate limit ~40/s/socket; cursor ~20/s/socket
- Max update payload 512KB; max 500 elements per update; soft scene cap 12k
- Excalidraw scene kept via imperative API; collaborator cursors updated without remounting

## Local development

1. Start backend (`conference-backend` `npm run dev`) and frontend (`conference-frontend` `npm run dev`)
2. Join the same meeting as two users
3. Open whiteboard from the control bar
4. Draw on one client — the other should sync within ~100ms

## Tests

```bash
cd conference-backend
npm run test:whiteboard
```

## Adding features

- Prefer Excalidraw public APIs (`updateScene`, `addFiles`, `exportToBlob`)
- New Socket events belong in `WB_EVENTS` + Zod validators on both sides
- Do not put Socket.IO listeners directly in React UI components
