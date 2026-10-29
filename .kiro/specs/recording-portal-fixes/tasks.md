# Implementation Plan

- [ ] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Five Recording Portal Bugs
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms each bug exists
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug on unfixed code
  - **Scoped PBT Approach**: For deterministic bugs (Bug 4), scope to concrete failing case(s) for reproducibility
  - **Bug 1 — Fake Playback**: Render `RecordingPlayer` with `src={undefined}` and `autoPlay={true}`; after 2 s assert `current` is still 0 (isBugCondition_1: `src IS UNDEFINED AND autoPlay = true`). Also render `RecordingDetailPage` with a recording whose `status='processing'`; assert `<RecordingPlayer>` is NOT mounted.
  - **Bug 2 — Full-file Blob Download**: Open `RecordingDetailPage` and assert the `<video>` element's `src` attribute is NOT a `blob:` URL; also assert `getStreamBlobUrl` is NOT called during page load for playback (isBugCondition_2: `request.type = 'stream_playback' AND request.download = false`).
  - **Bug 3 — Single Participant**: Call GET `/recordings/:id` with a recording document whose `meetingId` exists but whose meeting document was deleted; assert `participants.length > 1`. Also fetch a recording with a guest participant (no `userId`); assert the guest appears in the response (isBugCondition_3: `participants.length = 1 AND actual_attendee_count > 1`).
  - **Bug 4 — Rename Visible**: Render `RecordingsTable` and open the row action menu; assert the string "Rename" IS present in the rendered HTML (this confirms the bug — test will fail after fix). Same for `RecordingDetailPage` actions menu (isBugCondition_4: `'Rename' IN actionsMenu(component)`).
  - **Bug 5 — No Bulk Bar**: Render `RecordingsTable` with 3 rows pre-selected; assert no element with bulk-actions text is rendered (isBugCondition_5: `selected.size > 0 AND BulkActionsBar IS NOT RENDERED`).
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found: e.g. `current` advances past 0 with no src; video src is `blob:http://...`; `participants.length === 1` when 3 attended; "Rename" found in menu; no bulk bar rendered
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.13, 1.14, 1.15_

- [ ] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Existing Correct Behaviors Across All Five Areas
  - **IMPORTANT**: Follow observation-first methodology — observe real behavior on UNFIXED code for non-buggy inputs, then encode it as tests
  - **Bug 1 — Real src preservation**: Observe `RecordingPlayer` with a valid blob URL as `src`; record that play/pause, seek, skip, mute, and speed controls all work. Write property: for any non-empty string `src`, controls respond correctly and the interval timer is NOT used (from Preservation Requirements 3.1, 3.2, 3.3).
  - **Bug 2 — Download preservation**: Observe that calling `download()` on an existing recording triggers a file-save dialog and does not throw. Write property: `download()` always invokes `getStreamBlobUrl` with `{download: true}` and creates an `<a>` click (from Preservation Requirements 3.4, 3.5).
  - **Bug 2 — View count preservation**: Observe that opening a detail page increments `recording.views` by exactly 1. Assert this holds after the streaming URL approach changes (Preservation Requirement 3.6).
  - **Bug 3 — Fully populated participants unchanged**: Observe that a recording with `participants.length > 1` already stored returns the same list from the API. Write property: for recordings where stored participants are complete, the response is identical before and after the fix (Preservation Requirements 3.7, 3.8).
  - **Bug 4 — Remaining menu actions intact**: Observe that `RecordingsTable` row menu contains "Play recording", "Share link", "Download", and "Delete". Write property: for any row, those four labels are always present (Preservation Requirements 3.10, 3.11).
  - **Bug 5 — Zero-selection footer**: Observe that with `selected.size = 0` the table footer shows pagination and no bulk bar. Write property: for zero-selection state, `BulkActionsBar` is absent and pagination renders (Preservation Requirements 3.13, 3.14).
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

- [ ] 3. Fix Bug 1 — Fake Playback (RecordingPlayer + RecordingDetailPage)

  - [ ] 3.1 Guard fake-timer interval in RecordingPlayer
    - In `client/src/features/dashboard/components/RecordingPlayer.tsx`, verify the `useEffect` that calls `window.setInterval` already begins with `if (src) return;`; if the guard is absent or uses a different condition, add `if (src) return;` as the very first statement inside that effect
    - The overlay Play button (`!playing && ready`) already requires `ready` to be true, and `ready` is only set to `true` inside the `onReady` video event listener which is itself guarded by `if (!src || !videoRef.current) return` — confirm this chain is intact so the button never appears without a real src
    - _Bug_Condition: isBugCondition_1 — src IS UNDEFINED OR src IS NULL AND autoPlay = true_
    - _Expected_Behavior: timer interval does NOT run; current stays 0; playing stays false when src is absent_
    - _Preservation: When src is a valid URL, play/pause/seek/skip/mute/speed all continue to work normally (Requirements 3.1, 3.2, 3.3)_
    - _Requirements: 2.3_

  - [ ] 3.2 Add status guard in RecordingDetailPage
    - In `client/src/features/dashboard/pages/RecordingDetailPage.tsx`, after `recording` is loaded, add a branch before rendering `<RecordingPlayer>`: if `recording.status === 'processing'` render a status card with "Processing…" message; if `recording.status === 'failed'` render a card with "Recording unavailable" message; only render `<RecordingPlayer>` when `recording.status === 'ready'`
    - Guard the `getStreamDirectUrl` call (added in task 4.2) so it is only invoked when `recording.status === 'ready'`
    - _Bug_Condition: isBugCondition_1 — recording.status is 'processing' or 'failed' causes player to mount_
    - _Expected_Behavior: Player not mounted for non-ready status; appropriate message shown instead_
    - _Preservation: Ready recordings continue to load and play normally (Requirement 3.1)_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - No Fake Playback Without Source
    - **IMPORTANT**: Re-run the SAME tests from task 1 for Bug 1 — do NOT write new tests
    - Run the Bug 1 exploration checks: `src=undefined + autoPlay=true` → current stays 0; `status='processing'` → player not mounted
    - **EXPECTED OUTCOME**: Tests PASS (confirms fake-timer bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.4 Verify preservation tests still pass for Bug 1
    - **Property 2: Preservation** - Real Video Playback Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 for Bug 1 — do NOT write new tests
    - Run: valid src → controls work; loading indicator shown while URL resolves
    - **EXPECTED OUTCOME**: Tests PASS (no regressions in real playback)
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Fix Bug 2 — Playback Delay (recordings.service.ts + recordings.routes.ts + RecordingDetailPage)

  - [ ] 4.1 Add getStreamDirectUrl to client recordingsService
    - In `client/src/services/recordings/recordings.service.ts`, add a new synchronous method `getStreamDirectUrl(workspaceId: string | null | undefined, id: string): string` that constructs and returns the URL string `${API_URL}/recordings/${id}/stream?token=${token}&wsid=${workspaceId}` where `token` is obtained from `getAccessToken()`; if no token is available, omit the `token` param (the server will reject it, which is acceptable)
    - This method does NOT make a `fetch()` call — it only builds and returns the string
    - Keep `getStreamBlobUrl` unchanged; `download()` must continue to use it
    - _Bug_Condition: isBugCondition_2 — request.type = 'stream_playback' AND request.download = false_
    - _Expected_Behavior: getStreamDirectUrl returns a plain string URL; no buffering; browser can use range requests_
    - _Preservation: download() continues to use getStreamBlobUrl and triggers file-save dialog (Requirements 3.4, 3.5)_
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 4.2 Accept token query param in server stream route
    - In `server/src/modules/recordings/recordings.routes.ts`, in the `GET /:id/stream` route handler, before the workspace membership check runs: extract `req.query.token` as a string; if present, verify it as a JWT access token using the same verification logic used by the `authenticate` middleware; on success set `req.user` and the `X-Workspace-Id`-equivalent context so `requireWorkspace` can proceed without a `Bearer` header
    - Keep the existing `Bearer` header path fully intact — both auth paths must work independently
    - _Bug_Condition: isBugCondition_2 — stream endpoint must accept token query param so <video src> can load without a custom header_
    - _Expected_Behavior: Authenticated direct URL works; browser starts receiving bytes immediately_
    - _Preservation: Bearer header auth still works; unauthenticated access still rejected (Requirement 3.5); view count still increments once per page visit (Requirement 3.6)_
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 4.3 Replace getStreamBlobUrl with getStreamDirectUrl in RecordingDetailPage
    - In `client/src/features/dashboard/pages/RecordingDetailPage.tsx`, inside the `useEffect` that currently calls `recordingsService.getStreamBlobUrl(...)`, replace that call with `recordingsService.getStreamDirectUrl(activeWorkspace.workspaceId, recordingId)` — this is synchronous so no `await` or `async/await` wrapper is needed for the URL itself
    - Remove the `URL.revokeObjectURL(prev)` calls from both the `setStreamUrl` updater and the effect cleanup, since there is no longer a blob object URL to revoke
    - Wrap the call inside the existing `recording.status === 'ready'` guard added in task 3.2
    - _Bug_Condition: isBugCondition_2 — page previously loaded full blob before video could start_
    - _Expected_Behavior: <video> receives a direct URL; browser begins buffering immediately without waiting for full download_
    - _Preservation: Download button still calls recordingsService.download() which uses getStreamBlobUrl internally (Requirement 3.4)_
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 4.4 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Direct URL for Stream Playback
    - **IMPORTANT**: Re-run the SAME tests from task 1 for Bug 2 — do NOT write new tests
    - Run: open detail page → video src is NOT a `blob:` URL; `getStreamBlobUrl` NOT called during page load for playback
    - **EXPECTED OUTCOME**: Tests PASS (confirms full-blob download is eliminated for playback)
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 4.5 Verify preservation tests still pass for Bug 2
    - **Property 2: Preservation** - Download and Auth Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 for Bug 2 — do NOT write new tests
    - Run: download() triggers file-save; unauthenticated stream access is rejected; view count increments by 1
    - **EXPECTED OUTCOME**: Tests PASS (no regressions in download or auth flows)
    - _Requirements: 3.4, 3.5, 3.6_

- [ ] 5. Fix Bug 3 — Participant Count (server recordings.service.ts + recordings.routes.ts)

  - [ ] 5.1 Add meetingId to UploadRecordingInput and use it in saveComposite
    - In `server/src/modules/recordings/recordings.types.ts` (or wherever `UploadRecordingInput` is defined), add an optional field `meetingId?: string`
    - In `server/src/modules/recordings/services/recordings.service.ts`, in `saveComposite`: after the `Meeting.findOne({ roomId })` call, capture `const effectiveMeetingId = meeting?._id ?? (input.meetingId ? new Types.ObjectId(input.meetingId) : null)`; always call `listMeetingParticipants(String(effectiveMeetingId))` when `effectiveMeetingId` is non-null, regardless of whether `meeting` is null
    - In the legacy upload route (`POST /:roomId`), extract `meetingId` from query params or request body and pass it through to `saveComposite`
    - _Bug_Condition: isBugCondition_3A — meetingId IS NOT NULL AND participants.length = 1 AND MeetingParticipant.count > 1_
    - _Expected_Behavior: listMeetingParticipants called with effectiveMeetingId even when meeting document is gone; all historical participants saved_
    - _Preservation: Solo recordings (host only) continue to display the single participant correctly (Requirement 3.7); recordings with fully populated participants unchanged (Requirement 3.8)_
    - _Requirements: 2.7, 2.9_

  - [ ] 5.2 Fix enrichParticipants to preserve guest names
    - In `server/src/modules/recordings/recordings.routes.ts`, in the `enrichParticipants` function, update the `Promise.all` mapping: for entries where `p.userId` is falsy, resolve immediately with `null` (already done) but in the subsequent merge step, ensure the returned object uses `p.name ?? 'Participant'` and `p.avatarUrl ?? null` directly rather than falling back only when `u?.name` is unavailable — i.e., confirm the merge line reads `name: u?.name ?? p.name ?? 'Participant'`; if `p.name` is already stored in the DB entry this will preserve it
    - Confirm that `saveComposite` stores the `name` field from the `listMeetingParticipants` roster result; if not, fix the mapping so `name` is always written to the `participants` array in the `Recording.create()` call
    - _Bug_Condition: isBugCondition_3B — participant.userId IS UNDEFINED AND participant.name IS NOT EMPTY_
    - _Expected_Behavior: Guest participants retain their stored name in the API response; participant count equals MeetingParticipant count_
    - _Preservation: Registered participants (with userId) are still enriched from the user DB as before (Requirement 3.8); sharedBy field still displays uploader name/avatar (Requirement 3.9)_
    - _Requirements: 2.8, 2.9_

  - [ ] 5.3 Verify Bug 3 exploration test now passes
    - **Property 1: Expected Behavior** - All Participants Saved and Displayed
    - **IMPORTANT**: Re-run the SAME tests from task 1 for Bug 3 — do NOT write new tests
    - Run: recording with deleted meeting doc → `participants.length > 1`; guest participant → appears in API response with correct name
    - **EXPECTED OUTCOME**: Tests PASS (confirms participant count bug is fixed)
    - _Requirements: 2.7, 2.8, 2.9_

  - [ ] 5.4 Verify preservation tests still pass for Bug 3
    - **Property 2: Preservation** - Existing Participant Data Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 for Bug 3 — do NOT write new tests
    - Run: solo recording → single participant displayed; fully populated participants → unchanged API response; sharedBy → correct name/avatar
    - **EXPECTED OUTCOME**: Tests PASS (no regressions in participant display)
    - _Requirements: 3.7, 3.8, 3.9_

- [ ] 6. Fix Bug 4 — Remove Rename UI (RecordingsTable + RecordingDetailPage + RecordingsPage)

  - [ ] 6.1 Remove Rename from RecordingsTable
    - In `client/src/features/dashboard/components/RecordingsTable.tsx`:
    - Delete the `{ label: 'Rename', onClick: () => { setRenameTarget(r); setRenameValue(r.title); } }` entry from the array returned by `actionsFor()`
    - Delete the `renameTarget`, `renameValue`, and `renaming` state declarations
    - Delete the `confirmRename` async function
    - Delete the `<ConfirmDialog ... open={Boolean(renameTarget)} ... />` block for rename (keep the delete ConfirmDialog)
    - Remove `onRename` from the `Props` type definition and from the destructured props in the function signature
    - _Bug_Condition: isBugCondition_4 — 'Rename' IN actionsMenu('RecordingsTable')_
    - _Expected_Behavior: No "Rename" option in any row action menu; no rename dialog state exists in component_
    - _Preservation: Play recording, Share link, Download, and Delete actions remain in the menu (Requirements 3.10, 3.12)_
    - _Requirements: 2.10, 2.12_

  - [ ] 6.2 Remove Rename from RecordingDetailPage
    - In `client/src/features/dashboard/pages/RecordingDetailPage.tsx`:
    - Delete the `{ label: 'Rename', onClick: () => { setRenameValue(recording.title); setRenameOpen(true); } }` entry from the `RowActionsMenu` actions array
    - Delete the `renameOpen`, `renameValue`, and `renaming` state declarations
    - Delete the entire `<ConfirmDialog ... open={renameOpen} ... />` block for rename (keep the delete ConfirmDialog)
    - _Bug_Condition: isBugCondition_4 — 'Rename' IN actionsMenu('RecordingDetailPage')_
    - _Expected_Behavior: No "Rename" option in the detail page actions menu; no rename dialog state in component_
    - _Preservation: Copy link, Open in new tab, and Delete options remain functional (Requirement 3.11)_
    - _Requirements: 2.11, 2.12_

  - [ ] 6.3 Remove onRename prop from RecordingsPage
    - In `client/src/features/dashboard/pages/RecordingsPage.tsx`, delete the `onRename={async (id, title) => { await rename(id, title); }}` prop from the `<RecordingsTable>` JSX element
    - The `rename` function from `useRecordings` and `recordingsService.rename()` remain in place as API capability per Requirement 3.12
    - _Bug_Condition: isBugCondition_4 — onRename prop wires up dead rename path_
    - _Expected_Behavior: RecordingsTable no longer receives or uses onRename_
    - _Preservation: All other RecordingsTable props (onDelete, workspaceId, etc.) remain unchanged_
    - _Requirements: 2.12_

  - [ ] 6.4 Verify Bug 4 exploration test now passes
    - **Property 1: Expected Behavior** - Rename Absent from All Menus
    - **IMPORTANT**: Re-run the SAME tests from task 1 for Bug 4 — do NOT write new tests
    - Run: open row action menu in RecordingsTable → "Rename" NOT present; open detail page actions → "Rename" NOT present
    - **EXPECTED OUTCOME**: Tests PASS (confirms rename UI is fully removed)
    - _Requirements: 2.10, 2.11, 2.12_

  - [ ] 6.5 Verify preservation tests still pass for Bug 4
    - **Property 2: Preservation** - Other Menu Actions Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 for Bug 4 — do NOT write new tests
    - Run: table row menu → "Play recording", "Share link", "Download", "Delete" all present; detail page menu → "Copy link", "Open in new tab", "Delete" all present
    - **EXPECTED OUTCOME**: Tests PASS (no regressions in remaining menu actions)
    - _Requirements: 3.10, 3.11, 3.12_

- [ ] 7. Fix Bug 5 — Add Bulk Actions (RecordingsTable)

  - [ ] 7.1 Add BulkActionsBar to RecordingsTable
    - In `client/src/features/dashboard/components/RecordingsTable.tsx`:
    - Add a `bulkDeleteOpen` state: `const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)`
    - Add a `BulkActionsBar` rendered immediately before the `<div className="overflow-x-auto">` element, gated on `selected.size > 0`:
      ```tsx
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b border-[#E8ECF1] bg-[#EEF5FF] px-4 py-2.5">
          <span className="text-[12px] font-semibold text-[#016BE6]">
            {selected.size} selected
          </span>
          <button type="button" onClick={handleBulkDownload} ...>Download</button>
          <button type="button" onClick={() => setBulkDeleteOpen(true)} ...>Delete</button>
          <button type="button" onClick={() => setSelected(new Set())} aria-label="Clear selection" ...><X /></button>
        </div>
      )}
      ```
    - Add a `<ConfirmDialog>` for bulk delete: `open={bulkDeleteOpen}`, title `"Delete {selected.size} recordings?"`, description summarising the count, on confirm call `handleBulkDelete()`
    - _Bug_Condition: isBugCondition_5 — selected.size > 0 AND BulkActionsBar IS NOT RENDERED_
    - _Expected_Behavior: BulkActionsBar renders when selected.size > 0; shows correct count; Download and Delete buttons present_
    - _Preservation: When selected.size = 0, bar is absent and normal footer with pagination renders (Requirements 3.13, 3.14)_
    - _Requirements: 2.13, 2.14, 2.15, 2.16_

  - [ ] 7.2 Implement bulk download handler
    - Add `handleBulkDownload` async function that iterates over `[...selected]`, resolves each row's title from `items` (`items.find(r => r.id === id)?.title ?? id`), calls `recordingsService.download(workspaceId, id, title)` for each, then calls `notify(\`Downloaded \${selected.size} recording\${selected.size !== 1 ? 's' : ''}\`)`
    - Guard with `if (!workspaceId) { notify('No workspace selected'); return; }`
    - _Bug_Condition: isBugCondition_5 — no mechanism to bulk-download selected recordings_
    - _Expected_Behavior: Each selected recording downloads using the existing per-item download flow_
    - _Preservation: Per-row download from individual row actions menu continues to work independently (Requirement 3.15)_
    - _Requirements: 2.15_

  - [ ] 7.3 Implement bulk delete handler
    - Add `handleBulkDelete` async function that iterates over `[...selected]`, calls `onDelete(id)` for each (wrapped in `Promise.allSettled` to continue on partial failure), then calls `setItems(prev => prev.filter(r => !selected.has(r.id)))`, calls `setSelected(new Set())`, closes the dialog with `setBulkDeleteOpen(false)`, and calls `notify(\`Deleted \${selected.size} recording\${selected.size !== 1 ? 's' : ''}\`)`
    - After bulk delete, `selected.size` drops to 0 so the `BulkActionsBar` disappears automatically
    - _Bug_Condition: isBugCondition_5 — no mechanism to bulk-delete selected recordings_
    - _Expected_Behavior: Confirmation dialog shown; all selected recordings deleted; selection cleared; bar hidden; onDelete called for each_
    - _Preservation: Per-row delete from individual row actions continues to work independently (Requirement 3.15)_
    - _Requirements: 2.14, 2.16_

  - [ ] 7.4 Verify Bug 5 exploration test now passes
    - **Property 1: Expected Behavior** - Bulk Actions Visible When Rows Selected
    - **IMPORTANT**: Re-run the SAME tests from task 1 for Bug 5 — do NOT write new tests
    - Run: RecordingsTable with 3 pre-selected rows → BulkActionsBar renders with "3 selected"; Download and Delete buttons present
    - **EXPECTED OUTCOME**: Tests PASS (confirms bulk actions bar is now rendered)
    - _Requirements: 2.13, 2.14, 2.15, 2.16_

  - [ ] 7.5 Verify preservation tests still pass for Bug 5
    - **Property 2: Preservation** - No Bulk Bar When Nothing Selected
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 for Bug 5 — do NOT write new tests
    - Run: selected.size = 0 → no BulkActionsBar; pagination footer renders; per-row actions still work independently
    - **EXPECTED OUTCOME**: Tests PASS (no regressions in zero-selection state or per-row actions)
    - _Requirements: 3.13, 3.14, 3.15_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Re-run the full test suite (unit + integration) covering all five bug areas
  - Confirm every exploration test (Property 1) now passes: fake-timer guarded, direct URL used for playback, all participants returned, Rename absent, BulkActionsBar rendered
  - Confirm every preservation test (Property 2) still passes: real playback unchanged, download triggers file-save, existing participants unchanged, remaining menu actions intact, zero-selection footer present
  - Verify TypeScript compiles without errors across all modified files: `RecordingPlayer.tsx`, `RecordingDetailPage.tsx`, `RecordingsTable.tsx`, `RecordingsPage.tsx`, `recordings.service.ts` (client), `recordings.routes.ts` (server), `recordings.service.ts` (server)
  - Verify no `renameTarget`, `renameOpen`, `renameValue`, `renaming`, or `onRename` references remain in `RecordingsTable.tsx`, `RecordingDetailPage.tsx`, or `RecordingsPage.tsx`
  - Ensure all tests pass; ask the user if questions arise
