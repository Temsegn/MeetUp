import { useState } from 'react';
import { Calendar, Check, Film, MessageSquare, MonitorUp, MousePointer2, Pencil, Video } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { PRODUCT_MODULES } from '../constants/landing.constants';
import { LP_BODY, LP_CARD, LP_EYEBROW, LP_H2, LP_SECTION } from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';
import { MeetingRoomPreview } from './MeetingRoomPreview';
import { ProductAppPreview } from './ProductAppPreview';

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

  return (
    <section id="product" className={`${LP_SECTION} bg-white`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
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

        <div className="mt-10 grid min-w-0 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
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

          <ProductAppPreview active={module.preview} alt={content.title} />
        </div>
      </div>
    </section>
  );
}

const COLLAB_ICONS = [Video, MonitorUp, Pencil, MousePointer2] as const;

export function CollaborationSection() {
  const copy = useLandingCopy();

  return (
    <section className={`${LP_SECTION} bg-[#F7F9FC]`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.collaboration.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.collaboration.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.collaboration.body}</p>
        </div>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
          <MeetingRoomPreview />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {copy.collaboration.items.map((item, i) => {
              const Icon = COLLAB_ICONS[i] ?? Video;
              return (
                <li key={item.title} className={`${LP_CARD} p-5`}>
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#016BE6]">
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-[#0F172A]">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#5B677A]">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
