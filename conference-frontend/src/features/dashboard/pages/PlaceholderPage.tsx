import { AppHeader } from '../components/AppHeader';
import { SectionCard } from '../components/SectionCard';

/** Lightweight placeholder until each section is built. */
export function PlaceholderPage({ title, blurb }: { title: string; blurb: string }) {
  const isWorkspaceish =
    title === 'Workspace' ||
    title === 'Members' ||
    title === 'Rooms' ||
    title === 'Billing & Plan' ||
    title === 'Invoices' ||
    title === 'Admin';

  if (isWorkspaceish) {
    return (
      <div className="-mx-3.5 flex h-full min-h-0 flex-col bg-white sm:-mx-5 md:-ml-6 lg:-mr-6">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-[#E8ECF1] px-3.5 pt-3.5 pb-3 sm:px-5 md:pl-6 lg:pr-6">
            <AppHeader title={title} subtitle={blurb} />
          </div>
          <div className="px-3.5 py-4 sm:px-5 md:px-6 lg:pr-6">
            <SectionCard title="Coming soon" className="max-w-3xl bg-white">
              <p className="text-sm text-[#6F7B8C]">
                This screen is part of the Samtal client dashboard. UI shell is ready — content will be
                wired next.
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AppHeader title={title} subtitle={blurb} />
      <SectionCard title="Coming soon">
        <p className="text-sm text-[#6F7B8C]">
          This screen is part of the Samtal client dashboard. UI shell is ready — content will be
          wired next.
        </p>
      </SectionCard>
    </div>
  );
}
