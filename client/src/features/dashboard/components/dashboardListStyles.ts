/** Shared list layout for dashboard Upcoming Meetings + Recent Recordings. */
export const DASHBOARD_LIST_CARD_HEADER_CLASS = 'mb-0 min-h-[52px]';

/** Dashboard home radii (Figma) — do not reuse on other pages. */
export const DASHBOARD_CARD_RADIUS_CLASS = 'rounded-[10.13px]';
/** KPI / stat box radius (dashboard, meetings, recordings, reports). */
export const DASHBOARD_STAT_RADIUS_CLASS = 'rounded-[10.02px]';
export const KPI_CARD_RADIUS_CLASS = DASHBOARD_STAT_RADIUS_CLASS;
export const DASHBOARD_QUICK_TILE_RADIUS_CLASS = 'rounded-[11.58px]';

export const DASHBOARD_LIST_CLASS = 'border-t border-[#EEF1F5] divide-y divide-[#EEF1F5]';

/** Same height as header band above the list. */
export const DASHBOARD_LIST_ROW_CLASS = 'flex min-h-[52px] items-center gap-2.5 py-2';

/** Recording rows with clearer vertical gap between items. */
export const DASHBOARD_RECORDING_ROW_CLASS = 'flex items-center gap-2.5 py-3';

export const DASHBOARD_RECORDING_THUMB_CLASS =
  'relative h-[44px] w-[54px] shrink-0 overflow-hidden rounded-md bg-[#E8F1FE]';

export const DASHBOARD_LIST_EMPTY_CLASS =
  'border-t border-[#EEF1F5] flex min-h-[52px] items-center justify-center text-[12px] tabular-nums text-[#8A94A6]';
