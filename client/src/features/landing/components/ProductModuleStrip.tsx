import { useState } from 'react';
import {
  Calendar,
  Check,
  Film,
  MessageSquare,
  MonitorUp,
  MousePointer2,
  Pencil,
  Video,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import { PRODUCT_MODULES } from '../constants/landing.constants';
import {
  LandingBlueWash,
  LP_BODY,
  LP_CARD,
  LP_EYEBROW,
  LP_H2,
  LP_ICON,
  LP_SECTION_SOFT,
  LP_SECTION_WHITE,
} from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';

const MODULE_ICONS = {
  meetings: Video,
  messages: MessageSquare,
  calendar: Calendar,
  recordings: Film,
} as const;

export function ProductModuleStrip() {
  const copy = useLandingCopy();
  const [active, setActive] = useState(0);
  const module = PRODUCT_MODULES[active];
  const content = copy.product.modules[module.id];
  const ActiveIcon = MODULE_ICONS[module.id];

  return (
    <section id="product" className={LP_SECTION_WHITE}>
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.product.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.product.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.product.body}</p>
        </div>

        <div className="mt-9 flex w-fit max-w-full flex-wrap gap-2">
          {PRODUCT_MODULES.map((m, i) => {
            const Icon = MODULE_ICONS[m.id];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors',
                  active === i
                    ? 'border-[#016BE6] bg-[#016BE6] text-white'
                    : 'border-[#E6EBF2] bg-white text-[#5B677A] hover:border-[#CBD5E1] hover:text-[#243044]',
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} />
                {copy.product.modules[m.id].label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid min-w-0 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <div className={`${LP_CARD} p-6 sm:p-8`}>
            <p className={LP_EYEBROW}>{content.label}</p>
            <h3 className="lp-display mt-2 text-[22px] font-semibold tracking-tight text-[#0F172A] sm:text-[24px]">
              {content.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[#5B677A]">{content.body}</p>
            <ul className="mt-7 space-y-3.5">
              {content.points.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#0F172A]">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#016BE6]" strokeWidth={2.25} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#CFE3FF] bg-[#F3F8FF] p-8 sm:p-10">
            <LandingBlueWash variant="light" />
            <div className="relative flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <span className={`${LP_ICON} size-16`}>
                <ActiveIcon className="size-7" strokeWidth={1.75} />
              </span>
              <p className="lp-display mt-5 text-[20px] font-semibold text-[#0F172A]">
                {content.label}
              </p>
              <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-[#5B677A]">
                {content.points[0]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const COLLAB_ICONS = [Video, MonitorUp, Pencil, MousePointer2] as const;

export function CollaborationSection() {
  const copy = useLandingCopy();

  return (
    <section className={LP_SECTION_SOFT}>
      <LandingBlueWash variant="light" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.collaboration.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.collaboration.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.collaboration.body}</p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {copy.collaboration.items.map((item, i) => {
            const Icon = COLLAB_ICONS[i] ?? Video;
            return (
              <li key={item.title} className={`${LP_CARD} p-6`}>
                <span className={LP_ICON}>
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-[#0F172A]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#5B677A]">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
