/**
 * Permission, command authorization, lifecycle, reconnect, and duplicate-message tests.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { createRemoteControlService, RemoteControlError } from '../services/remote-control.service';
import { assertSameMeetingMembership } from '../services/control-permission.service';
import type { ControlPeerRef, MeetingPresencePort } from '../types/remote-control.types';
import { RemoteControlActionSchema } from '../validators/remote-control-command.schema';

const ROOM = 'room-1';
const REQ: ControlPeerRef = { participantId: '11111111-1111-4111-8111-111111111111', userId: 'u-req', name: 'Tom', socketId: 'sock-tom' };
const TGT: ControlPeerRef = { participantId: '22222222-2222-4222-8222-222222222222', userId: 'u-tgt', name: 'Sara', socketId: 'sock-sara' };
const OTHER: ControlPeerRef = { participantId: '33333333-3333-4333-8333-333333333333', userId: 'u-oth', name: 'Lee', socketId: 'sock-lee' };

function makePresence(peers: ControlPeerRef[]): MeetingPresencePort {
  const map = new Map(peers.map((p) => [p.participantId, p]));
  return {
    getPeer(_roomId, participantId) {
      return map.get(participantId) ?? null;
    },
    isInRoom(_roomId, participantId) {
      return map.has(participantId);
    },
  };
}

function makeSvc(peers = [REQ, TGT, OTHER], now = () => 1_000) {
  const emitted: { socketId: string; event: string; payload: unknown }[] = [];
  const presence = makePresence(peers);
  const svc = createRemoteControlService({
    presence,
    transport: {
      emitToSocket(socketId, event, payload) {
        emitted.push({ socketId, event, payload });
      },
    },
    now,
    randomId: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    pendingTtlMs: 50_000,
  });
  return { svc, emitted, presence };
}

describe('control permission', () => {
  it('rejects when either party is not in the meeting', () => {
    const presence = makePresence([REQ]);
    assert.throws(
      () => assertSameMeetingMembership(presence, ROOM, REQ.participantId, TGT.participantId),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'NOT_IN_ROOM',
    );
  });

  it('rejects self-control', () => {
    const presence = makePresence([REQ]);
    assert.throws(
      () => assertSameMeetingMembership(presence, ROOM, REQ.participantId, REQ.participantId),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SELF_CONTROL',
    );
  });
});

describe('remote-control lifecycle', () => {
  let svc: ReturnType<typeof makeSvc>['svc'];
  let emitted: ReturnType<typeof makeSvc>['emitted'];

  beforeEach(() => {
    ({ svc, emitted } = makeSvc());
  });

  afterEach(() => {
    svc.dispose();
  });

  it('request → accept → action → revoke', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    assert.equal(session.state, 'pending');
    assert.ok(emitted.some((e) => e.event === 'remote-control:request' && e.socketId === TGT.socketId));

    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    assert.equal(svc.getSession(session.sessionId)?.state, 'active');
    assert.ok(emitted.some((e) => e.event === 'remote-control:started'));

    const action = svc.dispatchAction({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      seq: 1,
      actionType: 'OPEN_CHAT',
      payload: {},
    });
    assert.notEqual(action, 'duplicate');
    if (action !== 'duplicate') {
      assert.equal(action.seq, 1);
      assert.equal(action.actionType, 'OPEN_CHAT');
      assert.equal(action.attribution.initiatorName, 'Tom');
      assert.equal(action.attribution.executorName, 'Sara');
    }

    svc.stop({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
    });
    assert.equal(svc.getSession(session.sessionId)?.state, 'revoked');

    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 2,
          actionType: 'CLOSE_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SESSION_ENDED',
    );
  });

  it('does not start control before explicit accept', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 1,
          actionType: 'OPEN_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'NOT_ACTIVE',
    );
  });

  it('reject ends the session and blocks later commands', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: false,
    });
    assert.ok(emitted.some((e) => e.event === 'remote-control:rejected'));
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 1,
          actionType: 'OPEN_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SESSION_ENDED',
    );
  });

  it('is idempotent for duplicate requests from the same pair', () => {
    const a = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    const b = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    assert.equal(a.sessionId, b.sessionId);
  });

  it('rejects a second requester while a session is pending or active', () => {
    svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    assert.throws(
      () =>
        svc.requestControl({
          roomId: ROOM,
          requesterParticipantId: OTHER.participantId,
          requesterUserId: OTHER.userId,
          targetParticipantId: TGT.participantId,
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SESSION_BUSY',
    );
  });

  it('ignores duplicate sequence numbers', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    const first = svc.dispatchAction({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      seq: 1,
      actionType: 'OPEN_CHAT',
      payload: {},
    });
    const dup = svc.dispatchAction({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      seq: 1,
      actionType: 'OPEN_CHAT',
      payload: {},
    });
    assert.notEqual(first, 'duplicate');
    assert.equal(dup, 'duplicate');
  });

  it('rejects stale sequence numbers', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    svc.dispatchAction({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      seq: 1,
      actionType: 'OPEN_CHAT',
      payload: {},
    });
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 3,
          actionType: 'CLOSE_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'BAD_SEQUENCE',
    );
  });

  it('rejects unauthorized command types even if listed in the wire schema', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    session.permissions = ['OPEN_CHAT'];
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 1,
          actionType: 'TOGGLE_MUTE',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'COMMAND_NOT_ALLOWED',
    );
  });

  it('rejects impersonation of the requester', () => {
    assert.throws(
      () =>
        svc.requestControl({
          roomId: ROOM,
          requesterParticipantId: REQ.participantId,
          requesterUserId: 'not-tom',
          targetParticipantId: TGT.participantId,
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'IMPERSONATION',
    );
  });

  it('only the controlled user can accept', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    assert.throws(
      () =>
        svc.respond({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          accept: true,
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'FORBIDDEN',
    );
  });

  it('ends the session when either participant leaves', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    svc.onParticipantLeft(ROOM, TGT.participantId);
    assert.equal(svc.getSession(session.sessionId)?.state, 'ended');
  });

  it('rate-limits command flooding', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    for (let i = 1; i <= 20; i++) {
      svc.dispatchAction({
        sessionId: session.sessionId,
        actorParticipantId: REQ.participantId,
        actorUserId: REQ.userId,
        seq: i,
        actionType: 'OPEN_CHAT',
        payload: {},
      });
    }
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 21,
          actionType: 'OPEN_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'RATE_LIMITED',
    );
  });

  it('records audit events without secrets', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    const actions = svc.listAudits().map((a) => a.action);
    assert.ok(actions.includes('RC_REQUEST_CREATED'));
    assert.ok(actions.includes('RC_REQUEST_ACCEPTED'));
    assert.ok(actions.includes('RC_SESSION_STARTED'));
    assert.ok(svc.listAudits().every((a) => !JSON.stringify(a).includes('password')));
  });

  it('rejects invalid command payloads', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 1,
          actionType: 'SELECT_PARTICIPANT',
          payload: { participantId: 'not-a-uuid' },
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'INVALID_PAYLOAD',
    );
  });

  it('rejects unknown session ids', () => {
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 1,
          actionType: 'OPEN_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SESSION_NOT_FOUND',
    );
  });

  it('terminates on disconnect rather than restoring the session', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    svc.onParticipantLeft(ROOM, REQ.participantId);
    assert.equal(svc.getSession(session.sessionId)?.state, 'ended');
    assert.throws(
      () =>
        svc.dispatchAction({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          seq: 2,
          actionType: 'OPEN_CHAT',
          payload: {},
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SESSION_ENDED',
    );
  });

  it('forwards chat as the controlled identity with dual attribution', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    const action = svc.dispatchAction({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      seq: 1,
      actionType: 'SEND_CHAT',
      payload: { content: 'Hello from Sarah\'s chat' },
    });
    assert.notEqual(action, 'duplicate');
    if (action !== 'duplicate') {
      assert.equal(action.attribution.executorId, TGT.participantId);
      assert.equal(action.attribution.initiatorId, REQ.participantId);
    }
    assert.ok(svc.listHistory(session.sessionId).some((e) => e.action === 'SEND_CHAT'));
  });

  it('forwards SEND_REACTION as the controlled participant', () => {
    const { svc } = makeSvc();
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    const action = svc.dispatchAction({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      seq: 1,
      actionType: 'SEND_REACTION',
      payload: { reaction: '👍' },
    });
    assert.notEqual(action, 'duplicate');
    if (action !== 'duplicate') {
      assert.equal(action.actionType, 'SEND_REACTION');
      assert.equal(action.attribution.executorId, TGT.participantId);
    }
  });

  it('rejects cursor and commands after revoke', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    svc.stop({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
    });
    assert.throws(
      () =>
        svc.forwardCursor({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          x: 0.5,
          y: 0.5,
          visible: true,
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'SESSION_ENDED',
    );
  });

  it('only the controlled user can publish UI state', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    assert.throws(
      () =>
        svc.forwardUiState({
          sessionId: session.sessionId,
          actorParticipantId: REQ.participantId,
          actorUserId: REQ.userId,
          state: {
            version: 1,
            sidebar: 'chat',
            layout: 'gallery',
            selectedParticipantId: null,
            isMuted: false,
            isCameraOff: false,
            isSharingScreen: false,
            isHandRaised: false,
            chatDraft: '',
            showAllParticipants: false,
            scrollTop: 0,
          },
        }),
      (err: unknown) => err instanceof RemoteControlError && err.code === 'FORBIDDEN',
    );
  });

  it('keeps the session active when the controller switches views', () => {
    const session = svc.requestControl({
      roomId: ROOM,
      requesterParticipantId: REQ.participantId,
      requesterUserId: REQ.userId,
      targetParticipantId: TGT.participantId,
    });
    svc.respond({
      sessionId: session.sessionId,
      actorParticipantId: TGT.participantId,
      actorUserId: TGT.userId,
      accept: true,
    });
    svc.switchView({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      view: 'self',
    });
    assert.equal(svc.getSession(session.sessionId)?.state, 'active');
    svc.switchView({
      sessionId: session.sessionId,
      actorParticipantId: REQ.participantId,
      actorUserId: REQ.userId,
      view: 'remote',
    });
    assert.equal(svc.getSession(session.sessionId)?.state, 'active');
  });

  it('accepts SEND_CHAT and SEND_REACTION in the action schema', () => {
    const chat = RemoteControlActionSchema.safeParse({
      sessionId: REQ.participantId,
      seq: 1,
      actionType: 'SEND_CHAT',
      payload: { content: 'hi' },
    });
    const reaction = RemoteControlActionSchema.safeParse({
      sessionId: REQ.participantId,
      seq: 2,
      actionType: 'SEND_REACTION',
      payload: { reaction: '🎉' },
    });
    assert.equal(chat.success, true);
    assert.equal(reaction.success, true);
  });
});
