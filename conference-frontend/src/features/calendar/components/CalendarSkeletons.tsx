import { Skeleton, SkeletonCircle } from '../../dashboard/components/DashboardSkeletons';
import { cn } from '../../../lib/cn';

function ViewSwitcherSkeleton() {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-[#E8ECF1] bg-[#F8FAFC] p-1">
      <Skeleton className="h-8 w-16 rounded-lg" />
      <Skeleton className="h-8 w-14 rounded-lg" />
      <Skeleton className="h-8 w-12 rounded-lg" />
    </div>
  );
}

function SideToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-16 rounded-lg" />
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="size-8 rounded-lg" />
      <div className="ml-auto flex flex-wrap gap-1.5">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

function MonthCellSkeleton() {
  return (
    <div className="flex h-[11.5rem] flex-col gap-1.5 border-b border-r border-[#F1F4F8] p-2 sm:h-[12rem]">
      <Skeleton className="mb-1 size-5 rounded-full" />
      <Skeleton className="h-5 w-[90%] rounded-md" />
      <Skeleton className="h-5 w-[75%] rounded-md" />
      <Skeleton className="h-5 w-[60%] rounded-md" />
    </div>
  );
}

function MonthGridSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-7 border-b border-[#F1F4F8]">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center justify-center py-2.5">
            <Skeleton className="h-2.5 w-7" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }, (_, i) => (
          <MonthCellSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function LegendSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <SkeletonCircle className="size-2" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      ))}
    </div>
  );
}

function SidePanelSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#F1F4F8] px-3.5 py-3">
        <Skeleton className="mb-2 h-3.5 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="size-8 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="space-y-2.5 px-3.5 py-3">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-xl border border-[#F1F4F8] p-2.5"
          >
            <Skeleton className="mt-0.5 h-10 w-1 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-[80%]" />
              <Skeleton className="h-2.5 w-20" />
              <div className="flex items-center gap-1.5 pt-0.5">
                <SkeletonCircle className="size-5" />
                <Skeleton className="h-2.5 w-10" />
              </div>
            </div>
            <Skeleton className="h-7 w-12 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-[#F1F4F8] px-3.5 py-3">
        <Skeleton className="h-3 w-28" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-3 w-[70%]" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full calendar page loading skeleton — mirrors month grid + side panel layout.
 */
export function CalendarPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_minmax(260px,300px)]', className)}
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="min-w-0 space-y-3">
        <ViewSwitcherSkeleton />
        <MonthGridSkeleton />
        <LegendSkeleton />
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <SideToolbarSkeleton />
        <SidePanelSkeleton />
      </div>
    </div>
  );
}
