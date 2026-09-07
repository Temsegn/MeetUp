import {
  Skeleton,
  SkeletonCircle,
  StatCardSkeleton,
} from '../../dashboard/components/DashboardSkeletons';

export { StatCardSkeleton as MeetingStatCardSkeleton };

/** One table row matching MeetingsList columns. */
export function MeetingsTableRowSkeleton() {
  return (
    <tr className="border-b border-[#F1F4F8] last:border-b-0">
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[70%]" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <Skeleton className="h-3 w-10" />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <SkeletonCircle className="size-6" />
            <SkeletonCircle className="-ml-1.5 size-6" />
            <SkeletonCircle className="-ml-1.5 size-6" />
          </div>
          <Skeleton className="h-3 w-4" />
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <Skeleton className="h-3 w-16" />
      </td>
      <td className="px-3 py-3 align-middle">
        <Skeleton className="h-8 w-[88px] rounded-lg" />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-9 w-[72px] rounded-xl" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

/** Full meetings table skeleton with header, rows, and pagination. */
export function MeetingsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      aria-busy="true"
      aria-label="Loading meetings"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#EEF1F5] bg-[#FAFBFC]">
              {[
                'Meeting Name',
                'Date & Time',
                'Duration',
                'Participants',
                'Host',
                'Status',
                'Actions',
              ].map((label) => (
                <th
                  key={label}
                  className="px-3 py-3 text-[11px] font-semibold tracking-wide text-[#8A94A6] first:min-w-[240px] first:px-4 last:w-[140px] last:text-right"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <MeetingsTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F5] px-4 py-3">
        <Skeleton className="h-3 w-36" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-8 w-[88px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function InfoChipSkeleton() {
  return (
    <div className="rounded-xl border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1">
        <Skeleton className="size-3 rounded" />
        <Skeleton className="h-2 w-10" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** Meeting detail / preview page skeleton. */
export function MeetingDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-6" aria-busy="true" aria-label="Loading meeting">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="mb-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-[70%] max-w-md" />
        <Skeleton className="mt-2 h-3.5 w-[85%] max-w-lg" />
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <InfoChipSkeleton key={i} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <Skeleton className="mb-3 h-3.5 w-16" />
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-[#F1F4F8] bg-[#F8FAFC] px-3 py-2.5"
              >
                <SkeletonCircle className="size-6 shrink-0" />
                <Skeleton className="h-3 min-w-0 flex-1" />
                <Skeleton className="h-2.5 w-8 shrink-0" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
          <ul className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <SkeletonCircle className="size-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-[70%]" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </li>
            ))}
          </ul>
          <Skeleton className="mt-3 h-9 w-full rounded-lg" />
        </section>
      </div>

      <section className="rounded-xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <Skeleton className="mb-2 h-3.5 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full max-w-xl" />
          <Skeleton className="h-3 w-[92%] max-w-lg" />
          <Skeleton className="h-3 w-[85%] max-w-md" />
        </div>
      </section>
    </div>
  );
}
