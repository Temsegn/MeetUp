import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdmissionIdentityKey } from '../../../database/models/MeetingAdmission.model';

describe('meeting admission identity', () => {
  it('keys registered users by user id', () => {
    assert.equal(
      buildAdmissionIdentityKey({ userId: '507f1f77bcf86cd799439011' }),
      'user:507f1f77bcf86cd799439011',
    );
  });

  it('keys guests by email so refresh with a new guest_* id still matches', () => {
    assert.equal(
      buildAdmissionIdentityKey({
        userId: 'guest_aaaa',
        isGuest: true,
        email: 'Guest@Example.com',
      }),
      'email:guest@example.com',
    );
    assert.equal(
      buildAdmissionIdentityKey({
        userId: 'guest_bbbb',
        isGuest: true,
        email: 'guest@example.com',
      }),
      'email:guest@example.com',
    );
  });

  it('falls back to guest user id when email is missing', () => {
    assert.equal(
      buildAdmissionIdentityKey({ userId: 'guest_xyz', isGuest: true }),
      'guest:guest_xyz',
    );
  });
});
