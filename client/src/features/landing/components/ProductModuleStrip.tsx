import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { PRODUCT_MODULES } from '../constants/landing.constants';
import { useLandingCopy } from '../useLandingCopy';

export function ProductModuleStrip() {
  const copy = useLandingCopy();
  const [active, setActive] = useState(0);
  const module = PRODUCT_MODULES[active];
  const content = copy.product.modules[module.id];

  return (
    <section id="product" className="bg-[#F6F8FB] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#016BE6]">
            {copy.product.eyebrow}
          </p>
          <h2 className="mt-3 text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-0.03em] text-[#0B1220]">
            {copy.product.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#5A6B7C]">{copy.product.body}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {PRODUCT_MODULES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors',
                active === i
                  ? 'bg-[#0B1220] text-white'
                  : 'bg-white text-[#5A6B7C] ring-1 ring-[#E6EAF0] hover:text-[#0B1220]',
              )}
            >
              {copy.product.modules[m.id].label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#016BE6]">
              {content.label}
            </p>
            <h3 className="mt-2 text-[22px] font-semibold tracking-tight text-[#0B1220]">
              {content.title}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#5A6B7C]">{content.body}</p>
            <ul className="mt-6 space-y-3">
              {content.points.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[14px] text-[#0B1220]">
                  <span className="mt-2 h-px w-5 shrink-0 bg-[#016BE6]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E6EAF0] bg-white p-2 shadow-[0_16px_48px_-28px_rgba(11,18,32,0.35)]">
            <img
              key={module.id}
              src={module.image}
              alt=""
              className="block aspect-[16/10] w-full rounded-xl object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
