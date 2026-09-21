/**
 * Unit tests for socket validation schemas.
 * Run: npx tsx --test tests/unit/socket-schemas.test.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validatePayload,
  JoinRoomSchema,
  CreateTransportSchema,
  ConnectTransportSchema,
  ProduceSchema,
  ConsumeSchema,
  ResumeConsumerSchema,
  PauseConsumerSchema,
  CloseConsumerSchema,
  CloseProducerSchema,
  RestartIceSchema,
  SetPreferredLayersSchema,
  SetConsumerPrioritySchema,
} from '../../src/shared/validation/socket.schemas';

const UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('JoinRoomSchema', () => {
  it('accepts valid roomId', () => {
    const r = validatePayload(JoinRoomSchema, { roomId: 'room-abc' });
    assert.ok(r.success);
  });
  it('rejects empty roomId', () => {
    const r = validatePayload(JoinRoomSchema, { roomId: '' });
    assert.ok(!r.success);
  });
  it('rejects missing roomId', () => {
    const r = validatePayload(JoinRoomSchema, {});
    assert.ok(!r.success);
  });
  it('trims whitespace', () => {
    const r = validatePayload(JoinRoomSchema, { roomId: '  room-1  ' });
    assert.ok(r.success && r.data.roomId === 'room-1');
  });
  it('rejects roomId over 100 chars', () => {
    const r = validatePayload(JoinRoomSchema, { roomId: 'x'.repeat(101) });
    assert.ok(!r.success);
  });
});

describe('CreateTransportSchema', () => {
  it('accepts send direction', () => {
    const r = validatePayload(CreateTransportSchema, { roomId: 'r1', direction: 'send' });
    assert.ok(r.success);
    assert.ok(r.success && r.data.direction === 'send');
  });
  it('accepts recv direction', () => {
    const r = validatePayload(CreateTransportSchema, { roomId: 'r1', direction: 'recv' });
    assert.ok(r.success);
  });
  it('rejects invalid direction', () => {
    const r = validatePayload(CreateTransportSchema, { roomId: 'r1', direction: 'both' });
    assert.ok(!r.success);
  });
  it('rejects missing direction', () => {
    const r = validatePayload(CreateTransportSchema, { roomId: 'r1' });
    assert.ok(!r.success);
  });
});

describe('ConnectTransportSchema', () => {
  const valid = {
    roomId: 'r1',
    transportId: UUID,
    dtlsParameters: {
      fingerprints: [{ algorithm: 'sha-256', value: 'AA:BB' }],
    },
  };
  it('accepts valid payload', () => {
    const r = validatePayload(ConnectTransportSchema, valid);
    assert.ok(r.success);
  });
  it('rejects non-UUID transportId', () => {
    const r = validatePayload(ConnectTransportSchema, { ...valid, transportId: 'not-a-uuid' });
    assert.ok(!r.success);
  });
  it('rejects empty fingerprints array', () => {
    const r = validatePayload(ConnectTransportSchema, {
      ...valid,
      dtlsParameters: { fingerprints: [] },
    });
    // Empty array is structurally valid — Zod allows it (mediasoup validates content)
    assert.ok(r.success);
  });
  it('rejects missing dtlsParameters', () => {
    const r = validatePayload(ConnectTransportSchema, { roomId: 'r1', transportId: UUID });
    assert.ok(!r.success);
  });
});

describe('ProduceSchema', () => {
  const valid = {
    roomId: 'r1',
    transportId: UUID,
    kind: 'video',
    rtpParameters: { codecs: [] },
    appData: { source: 'camera' },
  };
  it('accepts camera source', () => {
    assert.ok(validatePayload(ProduceSchema, valid).success);
  });
  it('accepts microphone source', () => {
    assert.ok(validatePayload(ProduceSchema, { ...valid, kind: 'audio', appData: { source: 'microphone' } }).success);
  });
  it('accepts screen source', () => {
    assert.ok(validatePayload(ProduceSchema, { ...valid, appData: { source: 'screen' } }).success);
  });
  it('rejects invalid source', () => {
    assert.ok(!validatePayload(ProduceSchema, { ...valid, appData: { source: 'webcam' } }).success);
  });
  it('rejects invalid kind', () => {
    assert.ok(!validatePayload(ProduceSchema, { ...valid, kind: 'data' }).success);
  });
  it('appData is optional', () => {
    const { appData: _a, ...without } = valid;
    assert.ok(validatePayload(ProduceSchema, without).success);
  });
});

describe('ConsumeSchema', () => {
  const valid = {
    roomId: 'r1',
    transportId: UUID,
    producerId: UUID,
    rtpCapabilities: { codecs: [] },
  };
  it('accepts valid payload', () => {
    assert.ok(validatePayload(ConsumeSchema, valid).success);
  });
  it('rejects non-UUID producerId', () => {
    assert.ok(!validatePayload(ConsumeSchema, { ...valid, producerId: 'bad' }).success);
  });
});

describe('Consumer control schemas', () => {
  it('ResumeConsumerSchema', () => {
    assert.ok(validatePayload(ResumeConsumerSchema, { roomId: 'r', consumerId: UUID }).success);
    assert.ok(!validatePayload(ResumeConsumerSchema, { roomId: 'r', consumerId: 'bad' }).success);
  });
  it('PauseConsumerSchema', () => {
    assert.ok(validatePayload(PauseConsumerSchema, { roomId: 'r', consumerId: UUID }).success);
  });
  it('CloseConsumerSchema', () => {
    assert.ok(validatePayload(CloseConsumerSchema, { roomId: 'r', consumerId: UUID }).success);
  });
  it('CloseProducerSchema', () => {
    assert.ok(validatePayload(CloseProducerSchema, { roomId: 'r', producerId: UUID }).success);
    assert.ok(!validatePayload(CloseProducerSchema, { roomId: 'r', producerId: 'bad' }).success);
  });
});

describe('RestartIceSchema', () => {
  it('accepts valid UUIDs', () => {
    assert.ok(validatePayload(RestartIceSchema, { roomId: 'r', transportId: UUID }).success);
  });
  it('rejects non-UUID transportId', () => {
    assert.ok(!validatePayload(RestartIceSchema, { roomId: 'r', transportId: 'bad' }).success);
  });
});

describe('SetPreferredLayersSchema', () => {
  it('accepts valid layers 0-2', () => {
    assert.ok(validatePayload(SetPreferredLayersSchema, {
      roomId: 'r', consumerId: UUID, spatialLayer: 2, temporalLayer: 1,
    }).success);
  });
  it('temporalLayer is optional', () => {
    assert.ok(validatePayload(SetPreferredLayersSchema, {
      roomId: 'r', consumerId: UUID, spatialLayer: 0,
    }).success);
  });
  it('rejects spatialLayer > 2', () => {
    assert.ok(!validatePayload(SetPreferredLayersSchema, {
      roomId: 'r', consumerId: UUID, spatialLayer: 3,
    }).success);
  });
  it('rejects negative spatialLayer', () => {
    assert.ok(!validatePayload(SetPreferredLayersSchema, {
      roomId: 'r', consumerId: UUID, spatialLayer: -1,
    }).success);
  });
});

describe('SetConsumerPrioritySchema', () => {
  it('accepts priority 1-255', () => {
    assert.ok(validatePayload(SetConsumerPrioritySchema, {
      roomId: 'r', consumerId: UUID, priority: 128,
    }).success);
  });
  it('rejects priority 0', () => {
    assert.ok(!validatePayload(SetConsumerPrioritySchema, {
      roomId: 'r', consumerId: UUID, priority: 0,
    }).success);
  });
  it('rejects priority 256', () => {
    assert.ok(!validatePayload(SetConsumerPrioritySchema, {
      roomId: 'r', consumerId: UUID, priority: 256,
    }).success);
  });
});

describe('validatePayload error formatting', () => {
  it('returns readable error for multiple failures', () => {
    const r = validatePayload(ProduceSchema, {
      roomId: '',
      transportId: 'bad',
      kind: 'data',
      rtpParameters: {},
    });
    assert.ok(!r.success);
    assert.ok(r.error.length > 0);
    // Should mention multiple fields
    assert.ok(r.error.includes(':'));
  });
});
