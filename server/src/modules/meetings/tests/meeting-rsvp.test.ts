import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRsvpToken, rsvpUrl, verifyRsvpToken } from '../rsvp/meeting-rsvp.service';

const MEETING_ID = '65f1a2b3c4d5e6f708192a3b';

describe('meeting RSVP tokens', () => {
  it('round-trips meeting id and normalised email', () => {
    const token = createRsvpToken(MEETING_ID, '  Guest@Example.COM ');
    assert.deepEqual(verifyRsvpToken(token), { meetingId: MEETING_ID, email: 'guest@example.com' });
  });

  it('rejects a token whose payload was changed (answer for someone else)', () => {
    const token = createRsvpToken(MEETING_ID, 'guest@example.com');
    const [, sig] = token.split('.');
    const forged = Buffer.from(`${MEETING_ID}|boss@example.com`).toString('base64url');
    assert.equal(verifyRsvpToken(`${forged}.${sig}`), null);
  });

  it('rejects malformed tokens', () => {
    for (const bad of ['', 'abc', 'abc.def', '.', `${createRsvpToken(MEETING_ID, 'a@b.co')}x`]) {
      assert.equal(verifyRsvpToken(bad), null, bad);
    }
  });

  it('builds a frontend URL with the chosen answer', () => {
    const url = rsvpUrl('tok.en', 'declined');
    assert.match(url, /\/rsvp\/tok\.en\?r=declined$/);
  });
});
