# Recording Portal Fixes — Bugfix Design

## Overview

Five bugs degrade the recording portal in Samtal Meet. This document formalizes the bug conditions, root causes, and fix plans for each.

**Bug 1 — Fake Playback**: `RecordingPlayer` runs an interval-based progress timer even when no real video source is available, giving users a false impression of playback.

**Bug 2 — Full-file Blob Download**: The client downloads the entire MP4 file into memory before passing it to the `<video>` element, blocking playback until the download completes. The server already supports HTTP range requests and MP4 faststart.

**Bug 3 — Only Host Shown as Participant**: Recordings always show just the uploader as the sole participant because (a) `saveComposite` only looks up participants via the `Meeting` document, which may be `null` when the meeting has already ended, and (b) `enrichParticipants` in the route layer silently drops guest participants who have no `userId`.

**Bug 4 — Unwanted Rename Entry Point**: A "Rename" option appears in the actions menus of both `RecordingsTable` and `RecordingDetailPage`, but the product no longer surfaces this action via UI.

**Bug 5 — No Bulk Actions**: Selecting multiple recordings in the table does nothing — there is no bulk Delete or Download toolbar.

---

## Glossary

- **Bug_Condition (C)**: The predicate that identifies inputs that trigger a bug.
- **Property (P)**: The desired correct behavior for inputs satisfying C.
- **Preservation**: Existing correct behavior for inputs that do NOT satisfy C — must remain unchanged.
- **`RecordingPlayer`**: React component in `client/src/features/dashboard/components/RecordingPlayer.tsx` that renders the video player UI with custom controls.
- **`src`**: The `src` prop on `RecordingPlayer`; a blob/object URL or `undefined` while loading.
- **`getStreamBlobUrl`**: Method on the client `recordingsService` that fetches the entire MP4 into a `Blob` and returns an object URL.
- **`getStreamDirectUrl`**: Proposed new method that returns a direct streaming URL with an auth token, avoiding the full-file download.
- **`saveComposite`**: Server-side function in `recordings.service.ts` that converts a raw WebM upload to MP4 and persists the recording metadata.
- **`enrichParticipants`**: Helper in `recordings.routes.ts` that resolves stored participant stubs into full user profiles from the database.
- **`listMeetingParticipants`**: Service function in `meeting-participants.service.ts` that queries the `MeetingParticipant` collection for all historical participants of a meeting.
- **`MeetingParticipant`**: MongoDB collection that stores all participants who ever joined a meeting (persisted even after the meeting ends).
- **`actionsFor`**: Function in `RecordingsTable` that builds the row action menu items for a given recording row.
- **`BulkActionsBar`**: Proposed new component rendered inside `RecordingsTable` when `selected.size > 0`.

---

## Bug Details

### Bug 1 — Fake Playback Condition

The bug manifests when `RecordingPlayer` has no real video source (`src` is `undefined`) but `autoPlay` is `true`. The `onReady` event listener fires on the `<video>` element and sets `playing = true` via `didAutoPlay`, which then triggers the interval-based fake timer effect. Separately, even without `autoPlay`, a user tapping the central Play button can start the fake timer since there is no guard in the play button's `onClick`.

The `RecordingDetailPage` also fails to check `recording.status` before mounting the player, so a recording with status `'processing'` or `'failed'` still shows the full player shell.

**Formal Specification:**
```
FUNCTION isBugCondition_1(input)
  INPUT: input = { src: string | undefined, playing: boolean }
  OUTPUT: boolean

  RETURN input.src IS UNDEFINED OR input.src IS NULL
         AND input.playing = true
END FUNCTION
```

**Examples:**
- A legacy recording with no file on disk: `src` is `undefined`, `autoPlay=true` → progress bar advances, no video plays.
- A recording with `status = 'processing'`: player mounts, user taps Play → fake interval starts, "Loading recording…" text shows.
- A recording with `status = 'failed'`: same as above.
- A recording with `status = 'ready'` and `src` set to a valid URL → **not a bug**, plays normally.

---

### Bug 2 — Full-file Download Condition

The bug manifests when a recording stream is requested for playback (not download). `getStreamBlobUrl` calls `fetch()` + `res.blob()`, which buffers the entire response body. The `<video>` element only receives a URL after 100 % of the file has been transferred.

**Formal Specification:**
```
FUNCTION isBugCondition_2(request)
  INPUT: request = { type: 'stream_playback' | 'download', download: boolean }
  OUTPUT: boolean

  RETURN request.type = 'stream_playback'
         AND request.download = false
END FUNCTION
```

**Examples:**
- Opening a 200 MB recording detail page → user waits ~30 s before any video appears.
- Opening a 10 MB recording → user waits ~2 s unnecessarily before first frame.
- Clicking Download → **not a bug**, full-blob approach is appropriate for triggering a file-save.

---

### Bug 3 — Single Participant Condition

The bug has two triggering sub-conditions:

**Sub-condition A (saveComposite):** When the WebM upload arrives after the meeting has ended, `Meeting.findOne({ roomId })` returns `null`. Since `meeting?._id` is falsy, `listMeetingParticipants` is never called and participants defaults to just the uploader.

**Sub-condition B (enrichParticipants):** When a stored participant entry has no `userId` (e.g. a guest), `authRepository.findUserById(undefined)` returns `null`. The enriched entry keeps `null` for name rather than falling back to the stored `name` field, potentially making the list appear empty and triggering the uploader-only fallback.

**Formal Specification:**
```
FUNCTION isBugCondition_3A(recording)
  INPUT: recording = { meetingId: ObjectId | null, participants: array }
  OUTPUT: boolean

  RETURN recording.meetingId IS NOT NULL
         AND recording.participants.length = 1
         AND MeetingParticipant.count({ meetingId }) > 1
END FUNCTION

FUNCTION isBugCondition_3B(participant)
  INPUT: participant = { userId: string | undefined, name: string }
  OUTPUT: boolean

  RETURN participant.userId IS UNDEFINED OR participant.userId IS NULL
         AND participant.name IS NOT EMPTY
END FUNCTION
```

**Examples:**
- Meeting ends, 5 participants present; upload arrives 10 s later → recording shows only the host.
- Guest user (no userId) joined a meeting → their avatar is missing from the recording detail.
- Solo host records alone → **not a bug**, showing one participant is correct.

---

### Bug 4 — Rename Entry Point Condition

The bug manifests unconditionally whenever the actions menu is opened in either `RecordingsTable` or `RecordingDetailPage`. The "Rename" item is always present in the menu.

**Formal Specification:**
```
FUNCTION isBugCondition_4(component)
  INPUT: component = 'RecordingsTable' | 'RecordingDetailPage'
  OUTPUT: boolean

  RETURN 'Rename' IN actionsMenu(component)
END FUNCTION
```

**Examples:**
- Any row action menu in the recordings list → "Rename" option visible.
- The "…" menu on the recording detail page → "Rename" option visible.

---

### Bug 5 — Missing Bulk Actions Condition

The bug manifests when one or more rows are checked in `RecordingsTable`. The `selected` Set is updated internally but no bulk action controls are rendered anywhere.

**Formal Specification:**
```
FUNCTION isBugCondition_5(state)
  INPUT: state = { selected: Set<string> }
  OUTPUT: boolean

  RETURN state.selected.size > 0
         AND BulkActionsBar IS NOT RENDERED
END FUNCTION
```

**Examples:**
- User checks 3 rows → no toolbar appears, no way to delete or download in bulk.
- User checks the header checkbox (select all on page) → same, no bulk controls.
- User checks 0 rows → **not a bug**, toolbar correctly absent.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- (Bug 1) When `src` is a valid URL and `status = 'ready'`, the player SHALL continue to load and play video normally, and play/pause, seek, skip, mute, and speed controls SHALL work correctly.
- (Bug 2) The `download()` method SHALL continue to use the full-blob approach and trigger a browser file-save dialog.
- (Bug 2) The stream endpoint SHALL continue to require valid authentication; unauthenticated access SHALL be rejected.
- (Bug 2) Each page visit to a recording detail SHALL continue to increment the view count exactly once.
- (Bug 3) Recordings where the `participants` array is already fully populated SHALL continue to display all participants without re-querying the roster.
- (Bug 3) Solo recordings (host only) SHALL continue to display the single participant correctly.
- (Bug 3) The `sharedBy` field SHALL continue to display the uploader's name and avatar in the table.
- (Bug 4) `RecordingsTable` SHALL continue to display Play, Share, Download, and Delete options in the row action menu.
- (Bug 4) `RecordingDetailPage` SHALL continue to display Copy link, Open in new tab, and Delete options.
- (Bug 4) `recordingsService.rename()` and `useRecordings.rename` SHALL remain in place as API capability.
- (Bug 5) When no rows are selected, the normal table footer with pagination SHALL continue to render.
- (Bug 5) Per-row delete and download from individual row action menus SHALL continue to work independently of bulk selection state.

**Scope:**
Inputs that do not satisfy the respective bug conditions above are entirely unaffected by these fixes.

---

## Hypothesized Root Cause

### Bug 1

1. **Unguarded fake-timer effect**: The `useEffect` that runs `window.setInterval` is conditioned only on `!src && playing` implicitly via early-return — but the `onReady` handler on the `<video>` element fires even when `src` just became defined. When `src` is `undefined`, no `<video>` is mounted, so `onReady` never fires — however, a user clicking the Play button in the UI directly calls `setPlaying(true)` with no src check.
2. **autoPlay fires without src guard**: The `onReady` listener is only registered when `src` is set (inside the `if (!src || !videoRef.current) return` guard), so autoPlay via `didAutoPlay` is safe. The real path is the manual Play button click — it sets `playing = true` regardless of whether `src` is defined.
3. **Missing status check in RecordingDetailPage**: The page always mounts `RecordingPlayer` regardless of `recording.status`. There is no branch for `'processing'` or `'failed'` status.

### Bug 2

1. **Blob buffering**: `getStreamBlobUrl` calls `res.blob()` which waits for the full HTTP response. The `<video>` element never receives a URL until the download is 100 % complete.
2. **Range requests bypassed**: The server correctly handles `Range` headers and has `+faststart` on the MP4, but a blob object-URL hides these optimizations from the browser's media pipeline.
3. **No direct URL option**: The client has no way to pass a direct URL to `<video>` because the stream endpoint requires a `Bearer` token in the `Authorization` header, which `<video src>` cannot send.

### Bug 3

1. **Meeting lookup race**: `saveComposite` looks up the meeting by `roomId` at upload time. If the meeting has already ended and been cleaned up, the query returns `null`, short-circuiting the `listMeetingParticipants` call.
2. **Guest participant drop**: `enrichParticipants` maps every entry to `authRepository.findUserById(p.userId)`. When `p.userId` is `undefined`, the lookup returns `null` and the merge loses the stored `name`.

### Bug 4

1. **Dead code not cleaned up**: The rename feature was removed from the product but the UI entry points and associated state were never deleted from `RecordingsTable` and `RecordingDetailPage`.

### Bug 5

1. **Selection tracked but not surfaced**: `RecordingsTable` maintains a `selected` Set via `useState` but never renders any UI based on `selected.size > 0`.

---

## Correctness Properties

Property 1: Bug Condition 1 — No Fake Playback Without Source

_For any_ `RecordingPlayer` instance where `src` is `undefined` or `null` (isBugCondition_1 returns true), the fixed component SHALL NOT start the interval-based progress timer and SHALL NOT advance the `current` time counter regardless of the `autoPlay` prop value or user interaction with the Play button.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation 1 — Real Video Playback Unchanged

_For any_ `RecordingPlayer` instance where `src` is a non-empty string (isBugCondition_1 returns false), the fixed component SHALL produce identical behavior to the original component: video loads, controls respond, and autoPlay fires correctly.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 3: Bug Condition 2 — Direct URL for Stream Playback

_For any_ stream playback request where `download = false` (isBugCondition_2 returns true), the fixed `recordingsService.getStreamDirectUrl()` SHALL return a URL string that the browser's `<video>` element can load without buffering the entire file first, enabling HTTP range requests and near-instant first frame.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 4: Preservation 2 — Download Still Uses Full Blob

_For any_ download request (isBugCondition_2 returns false), the fixed `download()` method SHALL continue to use `getStreamBlobUrl` and trigger a browser file-save dialog, preserving existing download behavior.

**Validates: Requirements 3.4, 3.5, 3.6**

Property 5: Bug Condition 3 — All Participants Saved and Displayed

_For any_ recording where `isBugCondition_3A` or `isBugCondition_3B` returns true, the fixed system SHALL save and display all participants who joined the meeting, including guests without a registered `userId`, and the participant count SHALL equal the historical `MeetingParticipant` collection count for that meeting.

**Validates: Requirements 2.7, 2.8, 2.9**

Property 6: Preservation 3 — Existing Participant Data Unchanged

_For any_ recording where neither `isBugCondition_3A` nor `isBugCondition_3B` holds (participants already fully populated, solo host), the fixed system SHALL produce the same participant list as the original system.

**Validates: Requirements 3.7, 3.8, 3.9**

Property 7: Bug Condition 4 — Rename Absent from Menus

_For any_ actions menu opened in `RecordingsTable` or `RecordingDetailPage` (isBugCondition_4 returns true for the current code), the fixed components SHALL NOT render a "Rename" option, and no rename-related state or dialog SHALL exist in either component.

**Validates: Requirements 2.10, 2.11, 2.12**

Property 8: Preservation 4 — Other Menu Actions Unchanged

_For any_ actions menu opened after the rename removal (isBugCondition_4 no longer applies), all remaining actions (Play, Share, Download, Delete in the table; Copy link, Open in new tab, Delete in the detail page) SHALL continue to work exactly as before.

**Validates: Requirements 3.10, 3.11, 3.12**

Property 9: Bug Condition 5 — Bulk Actions Visible When Rows Selected

_For any_ `RecordingsTable` state where `selected.size > 0` (isBugCondition_5 returns true), the fixed component SHALL render a `BulkActionsBar` displaying the selection count and functional Download and Delete buttons.

**Validates: Requirements 2.13, 2.14, 2.15, 2.16**

Property 10: Preservation 5 — No Bulk Bar When Nothing Selected

_For any_ `RecordingsTable` state where `selected.size = 0` (isBugCondition_5 returns false), the fixed component SHALL NOT render the `BulkActionsBar` and SHALL continue to show the normal footer with pagination.

**Validates: Requirements 3.13, 3.14, 3.15**

---

## Fix Implementation

### Bug 1 — Changes Required

**File:** `client/src/features/dashboard/components/RecordingPlayer.tsx`

**Specific Changes:**
1. **Guard the interval effect**: The existing fake-timer `useEffect` already has `if (src) return` at the top. Verify this guard is present and correct; if not, add `if (src) return;` as the first statement.
2. **Guard the Play button**: In the central overlay Play button's `onClick`, add a check: `if (!src) return;` (or simply omit mounting the button when `!src`). The button should only appear when `ready` is true, which already requires `src` — confirm the `!playing && ready` condition effectively prevents this.
3. **Disable autoPlay without src**: The `onReady` handler that triggers `setPlaying(true)` is already inside the `if (!src || !videoRef.current) return` guard, so autoPlay is safe. No change needed here.

**File:** `client/src/features/dashboard/pages/RecordingDetailPage.tsx`

**Specific Changes:**
4. **Status check before rendering player**: After loading, if `recording.status !== 'ready'`, render an unavailable state card instead of `<RecordingPlayer>`. Show a human-readable message: "Processing…" for `'processing'` and "Recording unavailable" for `'failed'`.
5. **Remove streamUrl fetch for non-ready**: Guard the `recordingsService.getStreamBlobUrl` call so it only runs when `recording.status === 'ready'`.

> Note: Bug 2's fix replaces `getStreamBlobUrl` for playback entirely; see Bug 2 changes below. The status check is still needed as a standalone guard.

---

### Bug 2 — Changes Required

**File:** `client/src/services/recordings/recordings.service.ts`

**Specific Changes:**
1. **Add `getStreamDirectUrl` method**: Returns `${API_URL}/recordings/${id}/stream?token=${accessToken}&wsid=${workspaceId}` (or similar). No fetch call; just string construction. Falls back gracefully if no token is available (returns the URL without a token — the server will reject it, which is acceptable since auth is required).
2. **Update `download()` to keep using `getStreamBlobUrl`**: No change to `download()` — it intentionally needs the full blob to trigger a file-save.

**File:** `server/src/modules/recordings/recordings.routes.ts`

**Specific Changes:**
3. **Accept `token` query param in the stream route**: Before calling `requireWorkspace`, extract `req.query.token`. If present, verify it as a JWT access token (reuse the same verification logic as `authenticate` middleware) and set `req.user` and the workspace header accordingly, so `requireWorkspace` can proceed without a `Bearer` header.
4. **Keep the `Bearer` header path intact**: The existing header-based auth must continue to work (used by the download flow and any direct API clients).

**File:** `client/src/features/dashboard/pages/RecordingDetailPage.tsx`

**Specific Changes:**
5. **Replace `getStreamBlobUrl` with `getStreamDirectUrl` for playback**: Change the `useEffect` that sets `streamUrl` to call `recordingsService.getStreamDirectUrl(workspaceId, recordingId)` synchronously (no `async/await` needed for URL construction) and set it directly. Remove the `URL.revokeObjectURL` cleanup since there's no blob object URL to revoke.

---

### Bug 3 — Changes Required

**File:** `server/src/modules/recordings/services/recordings.service.ts`

**Specific Changes:**
1. **Query `MeetingParticipant` directly in `saveComposite`**: Instead of relying on `meeting?._id` being truthy, pass `roomId` to look up the meeting ID. If the `Meeting` document is gone, query `MeetingParticipant` using the `roomId` field directly (if that field exists on the model) or store the `meetingId` from the meeting lookup before it can be null. A simpler approach: run `Meeting.findOne({ roomId })` as before, and additionally query `MeetingParticipant.find({ meetingId: ... })` even when `meeting` is null, by also trying `Meeting.findOne({ roomId }).select('_id')` with `{ lean: true }` — or just always attempt the participant query using whatever `meetingId` is available.

   Concretely: move the participant snapshot logic to run using `meeting?._id ?? (await Recording.findOne({ roomId }).lean())?._id` — or better, persist `meetingId` to a variable before the potential null and always try to fetch participants with that ID even if it's the only thing available.

   **Revised approach**: In `saveComposite`, after the `Meeting.findOne({ roomId })` call, if `meeting` is null, also try to find the `meetingId` from `MeetingParticipant.findOne({ ... })` by querying any recent participant entry. The cleanest fix: add a `meetingId` parameter to `UploadRecordingInput` so the client can pass it along with the WebM upload (since the client knows the meeting ID at recording time).

   **Simplest backward-compatible fix**: always call `listMeetingParticipants` with `String(meeting._id)` when available; if `meeting` is null, skip the historical lookup and accept the uploader-only fallback. The real fix for completeness is described in the next point.

2. **Pass `meetingId` in the upload payload**: Update the upload endpoint and `UploadRecordingInput` type to accept an optional `meetingId` in the request (e.g. as a query param or request header). In `saveComposite`, prefer `input.meetingId` over the meeting lookup result when both are available. This ensures participants are always found even if the meeting document is gone.

**File:** `server/src/modules/recordings/recordings.routes.ts`

**Specific Changes:**
3. **Fix `enrichParticipants` to preserve guest names**: Change the `Promise.all` mapping to skip `findUserById` when `p.userId` is falsy. Return the stored `name` and `avatarUrl` directly for those entries:
   ```typescript
   // Before:
   list.map((p) => (p.userId ? authRepository.findUserById(p.userId) : Promise.resolve(null)))
   // After:
   list.map((p) => (p.userId ? authRepository.findUserById(p.userId) : Promise.resolve(null)))
   // Then in the merge:
   name: u?.name ?? p.name ?? 'Participant'   // already present — verify p.name is used
   ```
   The merge line already has `u?.name ?? p.name ?? 'Participant'`, so the name fallback is there. The issue may be that `u` is `null` AND `p.name` is also lost because the stored participant entry has an empty name. Confirm by reading the `participants` array stored in the DB — ensure `saveComposite` stores `name` from `listMeetingParticipants` result.

---

### Bug 4 — Changes Required

**File:** `client/src/features/dashboard/components/RecordingsTable.tsx`

**Specific Changes:**
1. **Remove Rename from `actionsFor`**: Delete the `{ label: 'Rename', onClick: ... }` entry from the array returned by `actionsFor`.
2. **Remove rename state and dialog**: Delete `renameTarget`, `renameValue`, `renaming` state declarations, the `confirmRename` function, and the `ConfirmDialog` for rename.
3. **Remove `onRename` prop**: Delete the `onRename` prop from the `Props` type and all usages.

**File:** `client/src/features/dashboard/pages/RecordingDetailPage.tsx`

**Specific Changes:**
4. **Remove Rename from the actions array**: Delete `{ label: 'Rename', onClick: ... }` from the `RowActionsMenu` actions prop.
5. **Remove rename state and dialog**: Delete `renameOpen`, `renameValue`, `renaming` state declarations and the rename `ConfirmDialog` block.

**File:** `client/src/features/dashboard/pages/RecordingsPage.tsx`

**Specific Changes:**
6. **Remove `onRename` prop from `RecordingsTable`**: Delete the `onRename={async (id, title) => { ... }}` prop passed to `<RecordingsTable>`.

---

### Bug 5 — Changes Required

**File:** `client/src/features/dashboard/components/RecordingsTable.tsx`

**Specific Changes:**
1. **Add `BulkActionsBar` inline component**: Render between the outer `<section>` wrapper and the `<div className="overflow-x-auto">` element. Only render when `selected.size > 0`.
2. **Bulk Delete flow**: Add a `bulkDeleteOpen` state boolean. The Delete button in the bar opens a single `ConfirmDialog` summarising the count. On confirm, iterate over `[...selected]` and call `onDelete(id)` sequentially (or with `Promise.allSettled`), then clear selection and close.
3. **Bulk Download flow**: The Download button in the bar iterates over `[...selected]`, resolves each `RecordingRow` title from `items`, and calls `recordingsService.download(workspaceId, id, title)` for each. Show a toast via `onToast` with the count.
4. **Layout**: Position the bar as a sticky top element within the `<section>`, overlaid on the table, or as an inline block just above the `<div className="overflow-x-auto">`. Use a visually distinct style (e.g. blue/indigo background strip) so users immediately notice it.
5. **Auto-hide**: When `selected.size` drops to 0 (e.g. after bulk delete clears all selected items), the bar disappears automatically since it's gated on `selected.size > 0`.

---

## Testing Strategy

### Validation Approach

Testing follows the bug condition methodology: first run exploratory tests against the **unfixed** code to surface concrete counterexamples confirming the root cause, then write fix-checking and preservation tests to validate the corrected behavior.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug on unfixed code. Confirm or refute the root cause analysis.

**Bug 1 — Test Plan:**
Render `RecordingPlayer` with `src={undefined}` and `autoPlay={true}`. After 2 s, assert that `current` is still 0.
- **Test 1.1**: `src=undefined, autoPlay=true` → expect timer NOT running (will fail on unfixed code: timer advances)
- **Test 1.2**: `src=undefined`, user clicks Play button → expect `playing` stays `false` or timer stays at 0 (may fail)
- **Test 1.3**: `RecordingDetailPage` with `recording.status='processing'` → expect player not mounted (will fail: player mounts)

**Bug 2 — Test Plan:**
Intercept `recordingsService.getStreamDirectUrl` (to be added) vs `getStreamBlobUrl` calls. Confirm the detail page calls the blob method causing a full download.
- **Test 2.1**: Open detail page for a recording; assert that the `<video>` src is NOT a `blob:` URL (will fail on unfixed code)
- **Test 2.2**: Assert `getStreamBlobUrl` is NOT called during page load for playback (will fail on unfixed code)

**Bug 3 — Test Plan:**
Create a recording document in the test DB with `participants = [hostOnly]` and 3 `MeetingParticipant` rows. Fetch the recording via the API and assert `participants.length === 3`.
- **Test 3.1**: Recording with meetingId but meeting document deleted → participants = [host only] (will fail on unfixed code)
- **Test 3.2**: Recording with a guest participant (no userId) → guest absent from API response (will fail on unfixed code)

**Bug 4 — Test Plan:**
Render `RecordingsTable` and open the row action menu for any row. Assert "Rename" is not present.
- **Test 4.1**: Row action menu in table → "Rename" present (will fail assertion on unfixed code — i.e., it IS there)
- **Test 4.2**: `RecordingDetailPage` actions menu → "Rename" present (same)

**Bug 5 — Test Plan:**
Render `RecordingsTable` with 3 pre-selected rows. Assert a bulk action bar is visible.
- **Test 5.1**: `selected = {id1, id2, id3}` → no `BulkActionsBar` rendered (will fail on unfixed code)

**Expected Counterexamples:**
- Bug 1: `current` advances to 2+ after 2 s with no src
- Bug 2: video `src` is `blob:http://...` — a blob URL created from a full download
- Bug 3: `participants.length === 1` when 3+ participants attended
- Bug 4: "Rename" string found in rendered menu HTML
- Bug 5: no element with bulk-actions role/text is rendered

---

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the expected behavior.

**Pseudocode (general form):**
```
FOR ALL input WHERE isBugCondition_N(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior_N(result)
END FOR
```

**Bug 1:**
```
FOR ALL player WHERE player.src IS UNDEFINED DO
  ASSERT player.current REMAINS 0 after 3s
  ASSERT player.playing REMAINS false
  ASSERT unavailable UI is shown (not the play button overlay)
END FOR
```

**Bug 2:**
```
FOR ALL playbackRequest WHERE playbackRequest.download = false DO
  result := getStreamDirectUrl(workspaceId, id)
  ASSERT result IS a string (not a Promise)
  ASSERT result DOES NOT start with "blob:"
  ASSERT result CONTAINS accessToken query param
END FOR
```

**Bug 3:**
```
FOR ALL recording WHERE MeetingParticipant.count(meetingId) > 1 DO
  result := GET /recordings/:id (after fix)
  ASSERT result.participants.length = MeetingParticipant.count(meetingId)
END FOR
```

**Bug 4:**
```
FOR ALL actionsMenu IN [RecordingsTable, RecordingDetailPage] DO
  ASSERT 'Rename' NOT IN actionsMenu.labels
END FOR
```

**Bug 5:**
```
FOR ALL tableState WHERE tableState.selected.size > 0 DO
  ASSERT BulkActionsBar IS RENDERED
  ASSERT BulkActionsBar SHOWS selected.size
END FOR
```

---

### Preservation Checking

**Goal**: Verify that inputs not satisfying the bug conditions continue to behave identically before and after the fix.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_N(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because:
- It generates many random inputs across the full domain automatically.
- It catches edge cases that handwritten unit tests miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Preservation test plan:**
1. **Bug 1 — Real src preservation**: Generate random valid blob URLs as `src`. Verify play/pause, seek, skip, mute, speed all work the same as before.
2. **Bug 2 — Download preservation**: Call `download()` with any recording ID. Verify a file-save is triggered and no API error occurs.
3. **Bug 2 — View count**: Open a detail page; verify `views` increments by exactly 1 after the fix.
4. **Bug 3 — Populated participants unchanged**: Recordings where `participants.length > 1` already stored. Verify the API response is identical before and after.
5. **Bug 4 — Remaining actions intact**: After rename removal, open action menus and verify Play, Share, Download, Delete are all still present and functional.
6. **Bug 5 — Zero-selection state**: Render table with no rows checked. Verify no bulk bar is shown and pagination renders normally.

---

### Unit Tests

- `RecordingPlayer`: `src=undefined` + autoPlay → timer not running after 3 s
- `RecordingPlayer`: `src=undefined` + Play button click → `playing` stays false
- `RecordingDetailPage`: `status='processing'` → does not mount `RecordingPlayer`
- `recordingsService.getStreamDirectUrl`: returns a string URL containing `token=` and `wsid=`
- `enrichParticipants`: participant with no `userId` but with `name='Alice'` → returned with `name='Alice'`
- `saveComposite`: meeting document missing but participants found via meetingId → participants saved
- `RecordingsTable`: renders without "Rename" in any action menu
- `RecordingDetailPage`: renders without "Rename" in action menu
- `RecordingsTable`: `selected.size=3` → `BulkActionsBar` renders with "3 selected"
- `RecordingsTable`: bulk delete confirm → `onDelete` called for each selected ID

---

### Property-Based Tests

- Generate 100 random `RecordingPlayer` props with `src=undefined`; assert timer never starts regardless of `autoPlay` or interaction.
- Generate 100 random game states with 1–20 participants stored in `MeetingParticipant`; assert API response participant count matches DB count after fix.
- Generate random selection sets of size 1–50; assert `BulkActionsBar` renders and shows the correct count for all sizes.
- Generate random recording rows; assert no "Rename" label appears in any action menu for any row.

---

### Integration Tests

- End-to-end: upload a recording after a meeting ends, fetch the detail via the API, assert all meeting participants appear.
- End-to-end: open a recording detail page; assert the video begins buffering (first chunk received) within 2 s without waiting for full download.
- End-to-end: select 2 rows in the recordings table, click bulk Delete, confirm; assert both rows disappear.
- End-to-end: open `RecordingDetailPage` for a recording with `status='processing'`; assert the player is not mounted and a status message is shown.
