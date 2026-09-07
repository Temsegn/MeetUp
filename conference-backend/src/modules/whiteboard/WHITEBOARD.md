# Whiteboard (Excalidraw) — server notes

See also: `conference-frontend/src/features/whiteboard/WHITEBOARD.md`

## Module layout

```text
src/modules/whiteboard/
  websocket/whiteboard.gateway.ts
  services/whiteboard-room.service.ts
  services/whiteboard-scene.service.ts
  services/whiteboard-authz.service.ts
  services/whiteboard-visibility.service.ts
  persistence/whiteboard.repository.ts
  validators/whiteboard.schema.ts
  types/whiteboard.types.ts
  whiteboard.constants.ts
  tests/whiteboard.test.ts

src/database/models/WhiteboardDocument.model.ts
```

## Conflict handling

Server is authoritative. Stale element versions are rejected (`applied: []`).
Clients never replace the full scene on peer updates — they merge by element id.

## Migration from tldraw

tldraw used ephemeral `TLSocketRoom` memory with no DB. That state cannot be
converted to Excalidraw elements. Boards start empty after this migration.
