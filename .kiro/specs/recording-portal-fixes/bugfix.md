# Bugfix Requirements Document

## Introduction

This document captures requirements for five bugs in the Samtal Meet recording portal. The bugs affect playback correctness for legacy recordings (Bug 1), streaming performance (Bug 2), participant display accuracy (Bug 3), an unwanted UI action entry point (Bug 4), and a missing bulk-action capability for multi-selected rows (Bug 5). Together they degrade the usability and correctness of the recordings section for all workspace members.

---

## Bug 1: Old Recordings Show Fake Playback with No Content

### Bug Analysis

#### Current Behavior (Defect)

1.1 WHEN a recording has no accessible video file on disk (legacy upload before the MP4 pipeline) THEN the system displays "Loading recording…" in the video area while the progress bar advances as if playing

1.2 WHEN a recording has `status` of `'processing'` or `'failed'` THEN the system renders the player and starts the fake timer interval, showing a moving progress bar with no actual video content

1.3 WHEN `src` prop is `undefined` or `null` on `RecordingPlayer` and `autoPlay` is `true` THEN the system starts the interval-based fake playback timer, advancing current time without a real media source

#### Expected Behavior (Correct)

2.1 WHEN a recording has no accessible video file on disk THEN the system SHALL display a clear "unavailable" state (no player, no progress movement) instead of a fake-playing UI

2.2 WHEN a recording has `status` of `'processing'` or `'failed'` THEN the system SHALL display an appropriate status message (e.g. "Processing…" or "Recording unavailable") and SHALL NOT start the timer interval

2.3 WHEN `src` prop is `undefined` or `null` on `RecordingPlayer` THEN the system SHALL NOT start the fake interval timer regardless of `autoPlay` value

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a recording has a valid, accessible MP4 file and `status` is `'ready'` THEN the system SHALL CONTINUE TO load and play the video normally in `RecordingPlayer`

3.2 WHEN `src` is a valid URL THEN the system SHALL CONTINUE TO respond to play/pause, seek, skip, mute, and speed controls correctly

3.3 WHEN a recording is loading its stream URL THEN the system SHALL CONTINUE TO display the loading indicator until the URL resolves

---

## Bug 2: Significant Playback Delay Due to Full-File Blob Download

### Bug Analysis

#### Current Behavior (Defect)

1.4 WHEN a user opens a recording detail page THEN the system downloads the entire MP4 file as a single blob via `getStreamBlobUrl` before the video element can begin playback, causing a delay proportional to file size

1.5 WHEN a user presses play on a large recording THEN the system must complete the full HTTP response body download before creating an object URL, blocking playback start for the entire download duration

1.6 WHEN the client fetches the stream endpoint THEN the system uses a standard `fetch()` call that buffers the full response body, bypassing the server's HTTP range-request support and the MP4 `+faststart` moov-atom placement

#### Expected Behavior (Correct)

2.4 WHEN a user opens a recording detail page THEN the system SHALL provide the video element with a direct, authenticated streaming URL so the browser can use HTTP range requests and begin playback immediately without buffering the entire file

2.5 WHEN the browser seeks within a recording THEN the system SHALL serve only the requested byte range, enabling near-instant seek response

2.6 WHEN the `RecordingPlayer` receives a streaming URL THEN the system SHALL allow the browser to leverage the MP4 `moov` atom at the start of file (faststart) for instant playback start

#### Unchanged Behavior (Regression Prevention)

3.4 WHEN a user clicks the Download button THEN the system SHALL CONTINUE TO download the full file and trigger a browser file-save dialog

3.5 WHEN the stream endpoint is accessed THEN the system SHALL CONTINUE TO require valid workspace authentication (no unauthenticated access to recordings)

3.6 WHEN a recording stream URL is used THEN the system SHALL CONTINUE TO increment the view count exactly once per page visit

---

## Bug 3: Recordings Always Show Only the Host as Participant

### Bug Analysis

#### Current Behavior (Defect)

1.7 WHEN `saveComposite` is called and the meeting has already ended or the meeting document is not found by `roomId` THEN the system falls back to saving only the uploader as the sole participant, discarding all other attendees

1.8 WHEN `enrichParticipants` processes a participant entry that has no `userId` field (e.g. an anonymous/guest participant) THEN the system silently skips that participant, potentially leaving the enriched list empty and triggering the uploader-only fallback

1.9 WHEN the recording list and detail views display participants THEN the system shows only one participant (the host/uploader) even when multiple people joined the meeting

#### Expected Behavior (Correct)

2.7 WHEN `saveComposite` is called THEN the system SHALL query the `MeetingParticipant` collection by `meetingId` to retrieve all historical participants (not just currently-connected ones), and SHALL save all of them to the recording document

2.8 WHEN a participant entry has no `userId` (guest/anonymous) THEN the system SHALL retain the participant with their `name` field rather than silently dropping the entry

2.9 WHEN the recording detail page and list display participants THEN the system SHALL show all participants who joined the meeting, including guests without a registered user account

#### Unchanged Behavior (Regression Prevention)

3.7 WHEN a meeting has exactly one participant (the host, solo recording) THEN the system SHALL CONTINUE TO display that single participant correctly

3.8 WHEN participant data is fetched for a recording with a fully populated `participants` array THEN the system SHALL CONTINUE TO enrich and return all entries without re-querying the meeting roster unnecessarily

3.9 WHEN `sharedBy` is set on a recording THEN the system SHALL CONTINUE TO display the uploader's name and avatar in the "Shared By" column of the recordings table

---

## Bug 4: Rename Option Should Be Removed from Recording UI

### Bug Analysis

#### Current Behavior (Defect)

1.10 WHEN a user opens the actions menu (`RowActionsMenu`) on any row in `RecordingsTable` THEN the system displays a "Rename" option that should not be available

1.11 WHEN a user opens the actions menu (`RowActionsMenu`) on the `RecordingDetailPage` THEN the system displays a "Rename" option that should not be available

1.12 WHEN a user clicks "Rename" in either location THEN the system opens a rename dialog, allowing an action that the product no longer supports via UI

#### Expected Behavior (Correct)

2.10 WHEN a user opens the actions menu on a row in `RecordingsTable` THEN the system SHALL NOT display a "Rename" option

2.11 WHEN a user opens the actions menu on `RecordingDetailPage` THEN the system SHALL NOT display a "Rename" option

2.12 WHEN the rename-related UI elements (dialog, state variables, handlers) are removed THEN the system SHALL clean up all associated component state (`renameTarget`, `renameValue`, `renaming`, `renameOpen`, `ConfirmDialog` for rename) from both components

#### Unchanged Behavior (Regression Prevention)

3.10 WHEN a user opens the actions menu in `RecordingsTable` THEN the system SHALL CONTINUE TO display Play, Share, Download, and Delete options

3.11 WHEN a user opens the actions menu in `RecordingDetailPage` THEN the system SHALL CONTINUE TO display Copy link, Open in new tab, and Delete options

3.12 WHEN the `rename` function on `recordingsService` and `useRecordings` hook is preserved THEN the system SHALL CONTINUE TO expose the rename API capability for potential future use without UI entry points

---

## Bug 5: No Bulk Actions Available When Rows Are Selected

### Bug Analysis

#### Current Behavior (Defect)

1.13 WHEN a user checks one or more recording rows in `RecordingsTable` THEN the system updates the `selected` Set internally but displays no bulk action controls anywhere in the UI

1.14 WHEN a user selects multiple recordings and wants to delete them all THEN the system provides no mechanism to perform a bulk delete operation

1.15 WHEN a user selects multiple recordings and wants to download them all THEN the system provides no mechanism to initiate a bulk download

#### Expected Behavior (Correct)

2.13 WHEN one or more rows are selected in `RecordingsTable` THEN the system SHALL display a bulk action bar (within or above the table) showing the count of selected items along with "Download" and "Delete" buttons

2.14 WHEN the user clicks "Delete" in the bulk action bar THEN the system SHALL display a confirmation dialog and, upon confirmation, SHALL delete all selected recordings sequentially, removing each from the list and decrementing the count

2.15 WHEN the user clicks "Download" in the bulk action bar THEN the system SHALL initiate a download for each selected recording, using the existing per-item download capability

2.16 WHEN all selected recordings are deleted THEN the system SHALL clear the selection state and hide the bulk action bar

#### Unchanged Behavior (Regression Prevention)

3.13 WHEN no rows are selected THEN the system SHALL CONTINUE TO hide the bulk action bar and show the normal table footer with pagination

3.14 WHEN a user selects all rows on the current page via the header checkbox THEN the system SHALL CONTINUE TO select all visible rows correctly and the bulk action bar SHALL reflect the total count selected

3.15 WHEN a user performs a per-row delete or download from the individual row actions menu THEN the system SHALL CONTINUE TO work independently of the bulk selection state

---

## Bug Condition Summary

**Bug 1 — Fake Playback Condition:**
```pascal
FUNCTION isBugCondition_1(recording)
  RETURN recording.src IS NULL OR recording.src IS UNDEFINED
         AND recording.autoPlay = true
END FUNCTION

FOR ALL recording WHERE isBugCondition_1(recording) DO
  ASSERT timer interval is NOT running
  ASSERT progress bar does NOT advance
  ASSERT unavailable state is displayed
END FOR
```

**Bug 2 — Full-File Download Condition:**
```pascal
FUNCTION isBugCondition_2(request)
  RETURN request.type = STREAM_PLAYBACK AND request.download = false
END FUNCTION

FOR ALL request WHERE isBugCondition_2(request) DO
  result ← getStreamUrl'(request)
  ASSERT result is a direct streaming URL (not a blob URL from full download)
  ASSERT time-to-first-frame < threshold (no full file wait)
END FOR
```

**Bug 3 — Single Participant Condition:**
```pascal
FUNCTION isBugCondition_3(recording)
  RETURN recording.participants.length = 1
         AND actual_attendee_count(recording.meetingId) > 1
END FUNCTION

FOR ALL recording WHERE isBugCondition_3(recording) DO
  ASSERT recording.participants.length = actual_attendee_count(recording.meetingId)
END FOR
```

**Preservation for all bugs:**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
