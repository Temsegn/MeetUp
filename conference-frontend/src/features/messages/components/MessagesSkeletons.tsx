import { Skeleton, SkeletonCircle } from '../../dashboard/components/DashboardSkeletons';
import { cn } from '../../../lib/cn';

function ConversationRowSkeleton() {
  return (
    <div className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2 py-2">
      <SkeletonCircle className="size-9 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-[55%]" />
          <Skeleton className="h-2.5 w-10 shrink-0" />
        </div>
        <Skeleton className="h-2.5 w-[80%]" />
      </div>
    </div>
  );
}

function MessageBubbleSkeleton({ mine }: { mine?: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[70%] space-y-1', mine ? 'items-end' : 'items-start')}>
        <Skeleton className={cn('h-12 rounded-2xl', mine ? 'w-48 rounded-br-md' : 'w-56 rounded-bl-md')} />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/**
 * Full messages page loading skeleton — list · chat columns.
 */
export function MessagesPageSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading messages"
    >
      {/* Conversation list */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#F1F4F8] p-2.5">
          <Skeleton className="h-8 min-w-0 flex-1 rounded-lg" />
          <Skeleton className="size-8 shrink-0 rounded-lg" />
        </div>
        <div className="flex shrink-0 gap-1 border-b border-[#F1F4F8] px-2 py-1.5">
          <Skeleton className="h-7 w-12 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden p-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <ConversationRowSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Chat pane */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F1F4F8] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <SkeletonCircle className="size-9 shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-3 py-4">
          <div className="flex justify-center">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <MessageBubbleSkeleton />
          <MessageBubbleSkeleton mine />
          <MessageBubbleSkeleton />
          <MessageBubbleSkeleton mine />
          <MessageBubbleSkeleton />
        </div>

        <footer className="shrink-0 border-t border-[#F1F4F8] p-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-full" />
            <SkeletonCircle className="size-8 shrink-0" />
          </div>
        </footer>
      </section>
    </div>
  );
}
