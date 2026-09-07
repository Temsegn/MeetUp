import {
  BarChart3,
  MousePointer2,
  PenLine,
  Shield,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { ENTERPRISE_FEATURES } from '../constants/landing.constants';

const ICONS = {
  shield: Shield,
  video: Video,
  pen: PenLine,
  chart: BarChart3,
  mouse: MousePointer2,
} as const;

const BADGE = {
  shield: 'bg-[#E8F1FF] text-[#016BE6]',
  video: 'bg-[#DAF7E3] text-[#00A45C]',
  pen: 'bg-[#EDEBFF] text-[#7C3AED]',
  chart: 'bg-[#FFECD8] text-[#EA580C]',
  mouse: 'bg-[#E2F0FF] text-[#016BE6]',
};

export function EnterpriseBento() {
  const large = ENTERPRISE_FEATURES.find((f) => f.large)!;
  const small = ENTERPRISE_FEATURES.filter((f) => !f.large);
  const LargeIcon = ICONS[large.icon];

  return (
    <section id="enterprise" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#016BE6]">
            Enterprise
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[#151D2B]">
            Built for teams that cannot afford downtime
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#6F7B8C]">
            Security, collaboration, and visibility — in a layout your ops and IT teams will
            recognize.
          </p>
        </div>

        <div className="mt-10 grid gap-3 lg:grid-cols-3 lg:grid-rows-2">
          <article className="flex flex-col rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:row-span-2 lg:p-6">
            <span
              className={cn(
                'flex size-10 items-center justify-center rounded-full',
                BADGE[large.icon],
              )}
            >
              <LargeIcon className="size-5" strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-[18px] font-bold text-[#151D2B]">{large.title}</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#6F7B8C]">{large.body}</p>
            <ul className="mt-5 space-y-2 border-t border-[#F1F4F8] pt-4">
              {['Google & Microsoft sign-in', 'Role-based workspaces', 'Audit-ready sessions'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2 text-[12px] text-[#334155]">
                    <span className="size-1.5 rounded-full bg-[#016BE6]" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </article>

          {small.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <article
                key={feature.id}
                className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5"
              >
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full',
                    BADGE[feature.icon],
                  )}
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <h3 className="mt-3 text-[15px] font-bold text-[#151D2B]">{feature.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#6F7B8C]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
