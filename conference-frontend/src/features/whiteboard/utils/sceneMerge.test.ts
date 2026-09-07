/**
 * Frontend whiteboard scene merge unit tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  diffElements,
  mergeElements,
  shouldApplyRemote,
} from './sceneMerge';
import type { WhiteboardElement } from '../types';

function el(
  id: string,
  version: number,
  versionNonce: number,
  extra: Partial<WhiteboardElement> = {},
): WhiteboardElement {
  return { id, version, versionNonce, ...extra };
}

describe('sceneMerge', () => {
  it('prefers higher version', () => {
    assert.equal(shouldApplyRemote(el('a', 1, 1), el('a', 2, 1)), true);
    assert.equal(shouldApplyRemote(el('a', 3, 1), el('a', 2, 9)), false);
  });

  it('diffs only changed elements', () => {
    const prev = [el('a', 1, 1), el('b', 1, 1)];
    const next = [el('a', 2, 1), el('b', 1, 1)];
    const changed = diffElements(prev, next);
    assert.equal(changed.length, 1);
    assert.equal(changed[0].id, 'a');
  });

  it('merges without dropping peers elements', () => {
    const merged = mergeElements([el('a', 1, 1)], [el('b', 1, 1)]);
    assert.equal(merged.length, 2);
  });
});
