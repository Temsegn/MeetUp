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

  it('chunks large batches', async () => {
    const { chunkElements } = await import('./sceneMerge');
    const many = Array.from({ length: 450 }, (_, i) => el(`e${i}`, 1, 1));
    const chunks = chunkElements(many, 200);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 200);
    assert.equal(chunks[2].length, 50);
  });

  it('detects elements outside viewport', async () => {
    const { elementsOutsideViewport } = await import('./sceneMerge');
    const inside = el('in', 1, 1, { x: 10, y: 10, width: 20, height: 20 });
    const outside = el('out', 1, 1, { x: 5000, y: 5000, width: 40, height: 40 });
    const appState = {
      scrollX: 0,
      scrollY: 0,
      width: 400,
      height: 700,
      zoom: { value: 1 },
    };
    assert.equal(elementsOutsideViewport([inside], appState), false);
    assert.equal(elementsOutsideViewport([outside], appState), true);
  });
});
