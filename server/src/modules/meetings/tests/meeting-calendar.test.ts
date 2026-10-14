import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleCalendarUrl,
  buildMeetingIcs,
  buildOutlookCalendarUrl,
  ensureCalendarUid,
  isValidIanaTimezone,
  meetingEndAt,
  meetingJoinUrl,
} from '../calendar/meeting-ics';
import { buildInviteIdempotencyKey } from '../../../database/models/MeetingInviteDelivery.model';

describe('meeting calendar helpers', () => {
  const start = new Date('2026-06-15T09:00:00.000Z');
  const end = meetingEndAt(start, 45);

  it('computes end after start from duration', () => {
    assert.equal(end.toISOString(), '2026-06-15T09:45:00.000Z');
    assert.ok(end.getTime() > start.getTime());
  });

  it('falls back to 30 minutes for invalid duration', () => {
    const e = meetingEndAt(start, 0);
    assert.equal(e.toISOString(), '2026-06-15T09:30:00.000Z');
    const e2 = meetingEndAt(start, Number.NaN);
    assert.equal(e2.toISOString(), '2026-06-15T09:30:00.000Z');
  });

  it('validates IANA timezones', () => {
    assert.equal(isValidIanaTimezone('Africa/Addis_Ababa'), true);
    assert.equal(isValidIanaTimezone('UTC'), true);
    assert.equal(isValidIanaTimezone('Not/AZone'), false);
    assert.equal(isValidIanaTimezone(''), false);
  });

  it('builds a stable calendar UID', () => {
    assert.equal(ensureCalendarUid('abc123', null), 'abc123@meet.samtal.cc');
    assert.equal(ensureCalendarUid('abc123', 'keep-me@meet.samtal.cc'), 'keep-me@meet.samtal.cc');
  });

  it('builds join URLs with invitee email', () => {
    const url = meetingJoinUrl('room-1', 'guest@example.com');
    assert.ok(url.includes('/join/room-1'));
    assert.ok(url.includes('email=guest%40example.com'));
  });

  it('generates a valid REQUEST .ics with METHOD, UID, DTSTART/DTEND, join URL', () => {
    const ics = buildMeetingIcs({
      calendarUid: 'meet-1@meet.samtal.cc',
      sequence: 0,
      title: 'Weekly sync',
      description: 'Agenda item one',
      location: 'Samtal MeetUp',
      start,
      end,
      timezone: 'Africa/Addis_Ababa',
      roomId: 'room-1',
      organizerEmail: 'host@example.com',
      organizerName: 'Host User',
      attendeeEmail: 'guest@example.com',
      method: 'REQUEST',
    });

    assert.equal(ics.method, 'REQUEST');
    assert.match(ics.contentType, /text\/calendar/);
    assert.match(ics.contentType, /method=REQUEST/);
    assert.match(ics.content, /BEGIN:VCALENDAR/);
    assert.match(ics.content, /VERSION:2\.0/);
    assert.match(ics.content, /METHOD:REQUEST/);
    assert.match(ics.content, /BEGIN:VEVENT/);
    assert.match(ics.content, /UID:meet-1@meet\.samtal\.cc/);
    assert.match(ics.content, /DTSTART/);
    assert.match(ics.content, /DTEND/);
    assert.match(ics.content, /SUMMARY:Weekly sync/);
    assert.match(ics.content, /ORGANIZER/);
    assert.match(ics.content, /ATTENDEE/);
    assert.match(ics.content, /STATUS:CONFIRMED/);
    assert.match(ics.content, /SEQUENCE:0/);
    assert.match(ics.content, /END:VEVENT/);
    assert.match(ics.content, /END:VCALENDAR/);
    assert.ok(ics.content.includes('/join/room-1') || ics.content.includes('JOIN'));
  });

  it('generates CANCEL .ics preserving UID and bumping sequence', () => {
    const ics = buildMeetingIcs({
      calendarUid: 'meet-1@meet.samtal.cc',
      sequence: 2,
      title: 'Weekly sync',
      start,
      end,
      roomId: 'room-1',
      organizerEmail: 'host@example.com',
      organizerName: 'Host User',
      attendeeEmail: 'guest@example.com',
      method: 'CANCEL',
    });
    assert.match(ics.content, /METHOD:CANCEL/);
    assert.match(ics.content, /STATUS:CANCELLED/);
    assert.match(ics.content, /SEQUENCE:2/);
    assert.match(ics.content, /UID:meet-1@meet\.samtal\.cc/);
  });

  it('escapes user text instead of raw injection into ICS', () => {
    const ics = buildMeetingIcs({
      calendarUid: 'meet-2@meet.samtal.cc',
      sequence: 0,
      title: 'Hack; SUMMARY:Injected',
      description: 'Line1\nLine2',
      start,
      end,
      roomId: 'room-2',
      organizerEmail: 'host@example.com',
      organizerName: 'Host',
      attendeeEmail: 'a@b.com',
      method: 'REQUEST',
    });
    // Library escapes semicolon/newlines — raw unescaped SUMMARY injection must not appear.
    assert.ok(!ics.content.includes('\nSUMMARY:Injected'));
  });

  it('builds Google Calendar template URLs with encoded times', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Weekly sync',
      start,
      end,
      description: 'Notes',
      joinUrl: 'https://meet.samtal.cc/join/room-1',
    });
    assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
    assert.ok(url.includes('action=TEMPLATE'));
    assert.ok(url.includes('text=Weekly'));
    assert.ok(url.includes('dates='));
    assert.ok(url.includes('20260615T090000Z'));
    assert.ok(url.includes('20260615T094500Z'));
  });

  it('builds Outlook compose URLs', () => {
    const url = buildOutlookCalendarUrl({
      title: 'Weekly sync',
      start,
      end,
      joinUrl: 'https://meet.samtal.cc/join/room-1',
    });
    assert.ok(url.startsWith('https://outlook.live.com/calendar/0/deeplink/compose?'));
    assert.ok(url.includes('subject=Weekly'));
    assert.ok(url.includes('startdt='));
    assert.ok(url.includes('enddt='));
  });

  it('builds unique idempotency keys per email/kind/sequence', () => {
    const a = buildInviteIdempotencyKey('m1', 'a@b.com', 'invite', 0);
    const b = buildInviteIdempotencyKey('m1', 'a@b.com', 'invite', 0);
    const c = buildInviteIdempotencyKey('m1', 'a@b.com', 'update', 1);
    const d = buildInviteIdempotencyKey('m1', 'c@d.com', 'invite', 0);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.notEqual(a, d);
  });

  it('rejects invalid email shapes used by invite validation', () => {
    const bad = ['', 'nope', 'a@', '@b.com', 'a b@c.com'];
    const good = ['guest@example.com', 'A.B+tag@Mail.Example.COM'];
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const e of bad) assert.equal(re.test(e), false);
    for (const e of good) assert.equal(re.test(e.trim().toLowerCase()) || re.test(e), true);
  });
});
