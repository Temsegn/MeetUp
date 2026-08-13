import { useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

// ── Viewport size subscription ──────────────────────────────────────────────
// Uses useSyncExternalStore for tear-free reads — no stale dimensions.

function subscribeToResize(cb: () => void): () => void {
  window.addEventListener('resize', cb);
  window.addEventListener('orientationchange', cb);
  return () => {
    window.removeEventListener('resize', cb);
    window.removeEventListener('orientationchange', cb);
  };
}

let cachedSize = { w: window.innerWidth, h: window.innerHeight };

function getViewportSnapshot(): { w: number; h: number } {
  if (cachedSize.w !== window.innerWidth || cachedSize.h !== window.innerHeight) {
    cachedSize = { w: window.innerWidth, h: window.innerHeight };
  }
  return cachedSize;
}

// Sentinel for SSR (never hit in this SPA, but keeps TypeScript happy)
const SSR_SIZE = { w: 1280, h: 720 };

function useViewportSize() {
  const size = useSyncExternalStore(subscribeToResize, getViewportSnapshot, () => SSR_SIZE);
  return size;
}

// ── Layout constants ────────────────────────────────────────────────────────

/** Height consumed by the bottom control bar */
const CONTROLS_HEIGHT = 72;
/** Height of the top header bar */
const HEADER_HEIGHT = 52;
/** Gap between tiles (px) */
const TILE_GAP = 6;
/** Minimum tile width to keep things readable */
const MIN_TILE_W = 120;
/** Minimum tile height */
const MIN_TILE_H = 90;
/** Padding around the grid */
const GRID_PADDING = 8;

// ── Algorithm ───────────────────────────────────────────────────────────────

interface GridResult {
  layout: 'gallery' | 'presentation';
  gridStyle: CSSProperties;
  cols: number;
  rows: number;
}

/**
 * Google Meet-style optimal grid calculation.
 *
 * Given available viewport dimensions and participant count, finds the
 * column count that maximises tile area while fitting everything on screen.
 *
 * Approach: iterate over candidate column counts 1..n, compute the
 * resulting tile dimensions, and pick the candidate with the largest
 * tile area that respects minimum tile sizes.
 */
function computeGrid(
  viewW: number,
  viewH: number,
  count: number,
  sidebarOpen: boolean,
): { cols: number; rows: number; tileW: number; tileH: number } {
  const sidebarW = sidebarOpen ? 320 : 0;
  const availW = Math.max(viewW - sidebarW - GRID_PADDING * 2, MIN_TILE_W);
  const availH = Math.max(viewH - CONTROLS_HEIGHT - HEADER_HEIGHT - GRID_PADDING * 2, MIN_TILE_H);

  if (count <= 0) return { cols: 1, rows: 1, tileW: availW, tileH: availH };

  let bestCols = 1;
  let bestRows = count;
  let bestArea = 0;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);

    const tileW = (availW - TILE_GAP * (cols - 1)) / cols;
    const tileH = (availH - TILE_GAP * (rows - 1)) / rows;

    // Skip if tiles would be unreadably small
    if (tileW < MIN_TILE_W || tileH < MIN_TILE_H) continue;

    // Preserve 16:9-ish aspect ratio — cap tile dimensions
    const aspectW = tileH * (16 / 9);
    const effectiveW = Math.min(tileW, aspectW);
    const area = effectiveW * tileH;

    if (area > bestArea) {
      bestArea = area;
      bestCols = cols;
      bestRows = rows;
    }
  }

  // Fallback: if nothing fit the minimums, use a simple heuristic
  if (bestArea === 0) {
    bestCols = Math.ceil(Math.sqrt(count * (availW / availH)));
    bestCols = Math.max(1, Math.min(bestCols, count));
    bestRows = Math.ceil(count / bestCols);
  }

  const tileW = (availW - TILE_GAP * (bestCols - 1)) / bestCols;
  const tileH = (availH - TILE_GAP * (bestRows - 1)) / bestRows;

  return { cols: bestCols, rows: bestRows, tileW, tileH };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export const useResponsiveGrid = (
  participantCount: number,
  hasScreenShare: boolean,
  sidebarOpen = false,
): GridResult => {
  const viewport = useViewportSize();

  return useMemo(() => {
    if (hasScreenShare) {
      return {
        layout: 'presentation' as const,
        gridStyle: {} as CSSProperties,
        cols: 0,
        rows: 0,
      };
    }

    const displayed = Math.max(1, participantCount);
    const { cols, rows } = computeGrid(viewport.w, viewport.h, displayed, sidebarOpen);

    const gridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: `${TILE_GAP}px`,
      width: '100%',
      height: '100%',
      padding: `${GRID_PADDING}px`,
      overflow: 'hidden',
    };

    return {
      layout: 'gallery' as const,
      gridStyle,
      cols,
      rows,
    };
  }, [participantCount, hasScreenShare, sidebarOpen, viewport.w, viewport.h]);
};
