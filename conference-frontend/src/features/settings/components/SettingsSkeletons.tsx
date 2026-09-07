import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import type { SettingsSectionId } from '../constants';

function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block animate-pulse rounded-md bg-[#E8ECF1]', className)}
    />
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'rounded-[14px] border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function WorkspaceSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading workspace">
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Bone className="mx-auto size-28 shrink-0 rounded-[16px] sm:mx-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <Bone className="h-3.5 w-40" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Bone className="h-9 w-full rounded-[14px]" />
              <Bone className="h-9 w-full rounded-[14px]" />
              <Bone className="h-9 w-full rounded-[14px]" />
              <Bone className="h-9 w-full rounded-[14px]" />
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-3">
          <Bone className="h-3.5 w-32" />
          <Bone className="h-9 w-full rounded-[14px]" />
          <Bone className="h-9 w-full rounded-[14px]" />
          <Bone className="h-20 w-full rounded-[14px]" />
        </Card>
        <Card className="space-y-3">
          <Bone className="h-3.5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Bone className="size-8 shrink-0 rounded-full" />
              <Bone className="h-3 min-w-0 flex-1" />
              <Bone className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="h-48 space-y-3">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-9 w-full rounded-[14px]" />
          <Bone className="h-9 w-3/4 rounded-[14px]" />
        </Card>
        <Card className="h-40 space-y-3">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-16 w-full rounded-[14px]" />
        </Card>
      </div>
    </div>
  );
}

export function MembersSettingsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading members">
      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF1] px-3.5 py-3 sm:px-4">
          <Bone className="h-4 w-28" />
          <div className="flex flex-wrap items-center gap-2">
            <Bone className="h-9 w-44 rounded-[14px]" />
            <Bone className="h-9 w-28 rounded-[14px]" />
            <Bone className="h-9 w-32 rounded-[14px]" />
          </div>
        </div>
        <div className="px-3.5 py-2 sm:px-4">
          <div className="mb-2 grid grid-cols-[32%_14%_16%_14%_12%_12%] gap-2 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bone key={i} className="h-2.5 w-14" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[32%_14%_16%_14%_12%_12%] items-center gap-2 border-t border-[#E8ECF1]/80 py-3"
            >
              <div className="flex items-center gap-2">
                <Bone className="size-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Bone className="h-3 w-[70%]" />
                  <Bone className="h-2.5 w-[55%]" />
                </div>
              </div>
              <Bone className="h-6 w-16 rounded-full" />
              <Bone className="h-3 w-16" />
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-14 rounded-full" />
              <Bone className="ml-auto size-7 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading profile">
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <Bone className="size-28 rounded-full" />
            <Bone className="h-8 w-28 rounded-[14px]" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Bone className="h-3.5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Bone className="h-3 w-20" />
                <Bone className="h-10 w-full rounded-[14px]" />
              </div>
            ))}
            <Bone className="h-9 w-28 rounded-[14px]" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function AccountSettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading account">
      <Card className="space-y-4">
        <Bone className="h-3.5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-t border-[#EEF1F5] pt-3 first:border-0 first:pt-0">
            <div className="space-y-1.5">
              <Bone className="h-3 w-36" />
              <Bone className="h-2.5 w-48" />
            </div>
            <Bone className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </Card>
      <Card className="space-y-3">
        <Bone className="h-3.5 w-40" />
        <Bone className="h-9 w-full max-w-sm rounded-[14px]" />
        <Bone className="h-9 w-36 rounded-[14px]" />
      </Card>
    </div>
  );
}

export function InviteSettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading create user">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-4">
          <Bone className="h-3.5 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-9 w-full rounded-[14px]" />
            </div>
          ))}
          <Bone className="mt-2 h-3.5 w-28" />
          <Bone className="h-9 w-full rounded-[14px]" />
          <Bone className="h-16 w-full rounded-[14px]" />
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="space-y-3">
            <Bone className="h-3.5 w-28" />
            <Bone className="mx-auto size-16 rounded-full" />
            <Bone className="mx-auto h-3.5 w-28" />
            <Bone className="mx-auto h-2.5 w-40" />
          </Card>
          <Card className="space-y-2">
            <Bone className="h-3.5 w-36" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Bone className="size-4 rounded-full" />
                <Bone className="h-3 w-28" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PlaceholderSettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Card className="space-y-4 py-8">
        <Bone className="mx-auto h-4 w-40" />
        <Bone className="mx-auto h-3 w-72 max-w-full" />
        <Bone className="mx-auto mt-2 h-24 w-full max-w-md rounded-[14px]" />
      </Card>
    </div>
  );
}

export function SettingsSectionSkeleton({ section }: { section: SettingsSectionId }) {
  switch (section) {
    case 'workspace':
      return <WorkspaceSettingsSkeleton />;
    case 'members':
      return <MembersSettingsSkeleton />;
    case 'invite':
    case 'create-room':
    case 'create-team':
      return <InviteSettingsSkeleton />;
    case 'profile':
      return <ProfileSettingsSkeleton />;
    case 'account':
    case 'security':
    case 'integrations':
      return <AccountSettingsSkeleton />;
    default:
      return <PlaceholderSettingsSkeleton />;
  }
}
