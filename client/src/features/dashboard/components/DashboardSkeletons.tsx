import { cn } from '../../../lib/cn';
import type { ReactNode } from 'react';
import { DASHBOARD_LIST_ROW_CLASS, DASHBOARD_QUICK_TILE_RADIUS_CLASS, DASHBOARD_RECORDING_ROW_CLASS, DASHBOARD_STAT_RADIUS_CLASS } from './dashboardListStyles';

/** Base pulse bar for dashboard skeletons. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block animate-pulse rounded-md bg-[#E8ECF1]', className)}
    />
  );
}

export function SkeletonCircle({ className }: { className?: string }) {
  return <Skeleton className={cn('rounded-full', className)} />;
}

/** One KPI / stat card placeholder. */
export function StatCardSkeleton() {
  return (
    <article
      className={cn(
        DASHBOARD_STAT_RADIUS_CLASS,
        'flex min-h-[108px] flex-col border border-[#E8ECF1] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
      )}
    >
      <div className="flex items-center gap-1.5">
        <SkeletonCircle className="size-6" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="mt-3 flex flex-1 items-end gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-2.5 w-14" />
        </div>
        <Skeleton className="mb-0.5 h-8 min-w-0 flex-1" />
      </div>
      <Skeleton className="mt-2 h-2.5 w-14" />
    </article>
  );
}

/** Meeting row: time · title · avatars · action */
export function MeetingRowSkeleton() {
  return (
    <li className={DASHBOARD_LIST_ROW_CLASS}>
      <div className="w-[4rem] shrink-0 space-y-1">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-2 w-11" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-[70%]" />
        <div className="flex items-center">
          <SkeletonCircle className="size-5" />
          <SkeletonCircle className="-ml-1.5 size-5" />
          <SkeletonCircle className="-ml-1.5 size-5" />
        </div>
      </div>
      <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
    </li>
  );
}

/** Recording row: thumb · title · people · download */
export function RecordingRowSkeleton() {
  return (
    <li className={DASHBOARD_RECORDING_ROW_CLASS}>
      <Skeleton className="h-[44px] w-[54px] shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5">
        <Skeleton className="h-3 w-[75%]" />
        <Skeleton className="h-2 w-32" />
        <Skeleton className="h-2 w-10" />
      </div>
      <Skeleton className="size-7 shrink-0 rounded-md" />
    </li>
  );
}

/** Top participant row: avatar · name · meetings · hours */
export function ParticipantRowSkeleton() {
  return (
    <li className="flex items-center gap-2.5">
      <SkeletonCircle className="size-9 shrink-0" />
      <Skeleton className="h-3.5 min-w-0 flex-1" />
      <Skeleton className="h-3 w-16 shrink-0" />
      <Skeleton className="h-3.5 w-12 shrink-0" />
    </li>
  );
}

/** Activity feed row */
export function ActivityRowSkeleton() {
  return (
    <li className="flex gap-2">
      <SkeletonCircle className="mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-[85%]" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </li>
  );
}

/** Meeting insights metrics + chart */
export function InsightsBodySkeleton() {
  return (
    <div className="border-t border-[#EEF1F5] pt-3">
      <div className="mb-7 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="min-w-0 space-y-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex h-[120px] w-8 shrink-0 flex-col justify-between pb-5 pt-1">
          <Skeleton className="ml-auto h-2 w-6" />
          <Skeleton className="ml-auto h-2 w-4" />
          <Skeleton className="ml-auto h-2 w-3" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-[100px] w-full rounded-lg" />
          <div className="flex justify-between px-0.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-2 w-5" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Calendar month grid skeleton */
export function CalendarBodySkeleton() {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <div className="flex gap-1">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="size-5 rounded-md" />
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="mx-auto h-2.5 w-5" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="mx-auto size-7 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** Quick action tile skeleton */
export function QuickActionSkeleton() {
  return (
    <div
      className={cn(
        DASHBOARD_QUICK_TILE_RADIUS_CLASS,
        'flex min-h-[72px] flex-col items-center justify-center gap-2 bg-[#F5F7FA] px-2 py-3',
      )}
    >
      <Skeleton className="size-5 rounded" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

export function SectionCardSkeleton({
  titleWidth = 'w-28',
  children,
}: {
  titleWidth?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E8ECF1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Skeleton className={cn('h-3.5', titleWidth)} />
        <Skeleton className="h-3 w-14" />
      </div>
      {children}
    </section>
  );
}

/** Recording watch page skeleton. */
export function RecordingDetailSkeleton() {
  return (
    <div
      className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden pr-2 sm:pr-3 md:pr-4"
      aria-busy="true"
      aria-label="Loading recording"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          <Skeleton className="min-h-[200px] flex-[1.15] rounded-2xl" />

          <div className="min-h-0 flex-1 space-y-3 overflow-hidden pb-1">
            <div className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <Skeleton className="h-6 w-[70%] max-w-md" />
              <Skeleton className="mt-2 h-3 w-[85%] max-w-lg" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className="mb-2.5 flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <SkeletonCircle key={i} className="size-8" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <Skeleton className="h-3.5 w-14" />
              <div className="mt-2 space-y-2">
                <Skeleton className="h-3 w-full max-w-xl" />
                <Skeleton className="h-3 w-[90%] max-w-lg" />
              </div>
              <Skeleton className="mt-3 h-3 w-48" />
            </div>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] max-lg:max-h-[40vh]">
          <div className="shrink-0 border-b border-[#EEF1F5] px-3.5 py-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-1 h-2.5 w-32" />
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-hidden p-2">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl px-2 py-2">
                <Skeleton className="h-12 w-[68px] shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-[85%]" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

