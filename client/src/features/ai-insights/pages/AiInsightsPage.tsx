import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';

export function AiInsightsPage() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <AppHeader
        title="AI Insights"
        subtitle="Summaries, transcripts, and action items will connect here later."
      />
      <section className="rounded-2xl border border-[#E8ECF1] bg-white px-5 py-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#016BE6]">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 text-[16px] font-bold text-[#151D2B]">AI insights are not enabled yet</h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#6F7B8C]">
          Meeting summaries, searchable transcripts, and action items will appear after the AI
          service is integrated. Your live meetings and recordings stay available now.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/app/meetings"
            className="inline-flex h-9 items-center rounded-xl bg-[#016BE6] px-4 text-[12px] font-semibold text-white"
          >
            Go to meetings
          </Link>
          <Link
            to="/app/recordings"
            className="inline-flex h-9 items-center rounded-xl border border-[#E8ECF1] px-4 text-[12px] font-semibold text-[#151D2B]"
          >
            Go to recordings
          </Link>
        </div>
      </section>
    </div>
  );
}
