import { useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

// ── Viewport size subscription ──────────────────────────────────────────────

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

const SSR_SIZE = { w: 1280, h: 720 };

function useViewportSize() {
  return useSyncExternalStore(subscribeToResize, getViewportSnapshot, () => SSR_SIZE);
}

// ── Layout constants ────────────────────────────────────────────────────────

const CONTROLS_HEIGHT = 72;
const HEADER_HEIGHT = 52;
const TILE_GAP = 6;
const MIN_TILE_W = 120;
const MIN_TILE_H = 90;
const GRID_PADDING = 8;

// ── Algorithm ───────────────────────────────────────────────────────────────

interface GridResult {
  layout: 'gallery' | 'presentation';
  /** Outer flex column container */
  gridStyle: CSSProperties;
  /** Participants per row, top → bottom. Odd counts put the extra on top (e.g. [5,4]). */
  rowPlan: number[];
  cols: number;
  rows: number;
}

/**
 * Build an above/below row plan — never a single long horizontal strip for 3+.
 *
 * Examples:
 *  5 → [3, 2]
 *  7 → [4, 3]
 *  9 → [5, 4]
 *  10 → [5, 5]
 *  11 → [4, 4, 3]
 */
function buildRowPlan(count: number, maxCols: number): number[] {
  if (count <= 0) return [1];
  if (count === 1) return [1];
  if (count === 2) return [2]; // side-by-side is fine for 2

  // Prefer 2 rows for small/medium; 3 rows when it would be too wide or crowded
  let rowCount = 2;
  if (count > 10 || Math.ceil(count / 2) > maxCols) {
    rowCount = 3;
  }
  if (count > 16 || Math.ceil(count / 3) > maxCols) {
    rowCount = Math.max(3, Math.ceil(count / maxCols));
  }

  // Distribute so top rows get the extras (ceil), bottom gets the remainder.
  // e.g. 9 with 2 rows → [5, 4]; 11 with 3 rows → [4, 4, 3]
  const base = Math.floor(count / rowCount);
  let extra = count % rowCount;
  const plan: number[] = [];
  for (let i = 0; i < rowCount; i++) {
    const n = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    if (n > 0) plan.push(n);
  }
  return plan;
}

function maxColsForWidth(availW: number): number {
  return Math.max(1, Math.floor((availW + TILE_GAP) / (MIN_TILE_W + TILE_GAP)));
}

function computeLayout(
  viewW: number,
  viewH: number,
  count: number,
  sidebarOpen: boolean,
): { rowPlan: number[]; cols: number; rows: number } {
  const sidebarW = sidebarOpen ? 320 : 0;
  const availW = Math.max(viewW - sidebarW - GRID_PADDING * 2, MIN_TILE_W);
  const availH = Math.max(viewH - CONTROLS_HEIGHT - HEADER_HEIGHT - GRID_PADDING * 2, MIN_TILE_H);
  const maxCols = maxColsForWidth(availW);

  let rowPlan = buildRowPlan(count, maxCols);

  // If widest row still overflows min width, add rows until it fits
  while (Math.max(...rowPlan) > maxCols && rowPlan.length < count) {
    rowPlan = buildRowPlan(count, Math.max(1, Math.max(...rowPlan) - 1));
    // Force one more row by rebuilding with tighter cap
    const tighter = Math.max(...rowPlan) - 1;
    if (tighter < 1) break;
    const forcedRows = Math.ceil(count / tighter);
    const base = Math.floor(count / forcedRows);
    let extra = count % forcedRows;
    rowPlan = [];
    for (let i = 0; i < forcedRows; i++) {
      const n = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
      if (n > 0) rowPlan.push(n);
    }
  }

  // Ensure tiles aren't too short: if too many rows for height, merge carefully
  const maxRowsByHeight = Math.max(1, Math.floor((availH + TILE_GAP) / (MIN_TILE_H + TILE_GAP)));
  while (rowPlan.length > maxRowsByHeight && rowPlan.length > 1) {
    // Merge last two rows upward
    const last = rowPlan.pop()!;
    const prev = rowPlan.pop()!;
    rowPlan.push(prev + last);
  }

  const cols = Math.max(...rowPlan);
  return { rowPlan, cols, rows: rowPlan.length };
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
        rowPlan: [],
        cols: 0,
        rows: 0,
      };
    }

    const displayed = Math.max(1, participantCount);
    const { rowPlan, cols, rows } = computeLayout(
      viewport.w,
      viewport.h,
      displayed,
      sidebarOpen,
    );

    const gridStyle: CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: `${TILE_GAP}px`,
      width: '100%',
      height: '100%',
      padding: `${GRID_PADDING}px`,
      overflow: 'hidden',
      boxSizing: 'border-box',
    };

    return {
      layout: 'gallery' as const,
      gridStyle,
      rowPlan,
      cols,
      rows,
    };
  }, [participantCount, hasScreenShare, sidebarOpen, viewport.w, viewport.h]);
};
