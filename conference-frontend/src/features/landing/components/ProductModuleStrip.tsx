import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { PRODUCT_MODULES } from '../constants/landing.constants';

export function ProductModuleStrip() {
  const [active, setActive] = useState(0);
  const module = PRODUCT_MODULES[active];

  return (
    <section id="product" className="bg-[#F8FAFC] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#016BE6]">
            Product
          </p>
          <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[#151D2B]">
            Everything your team already uses — connected
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#6F7B8C]">
            Switch between live meetings, async messages, scheduling, and recordings without
            leaving Samtal.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {PRODUCT_MODULES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-xl border px-4 py-2 text-[13px] font-semibold transition-colors',
                active === i
                  ? 'border-[#016BE6] bg-white text-[#016BE6] shadow-sm'
                  : 'border-transparent bg-transparent text-[#6F7B8C] hover:bg-white hover:text-[#151D2B]',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <h3 className="text-[20px] font-bold text-[#151D2B]">{module.label}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6F7B8C]">{module.title}</p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Same design language as your dashboard',
                'Built for daily enterprise workflows',
                'Fast to learn, ready on day one',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-[#334155]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#016BE6]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white p-2 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <img
              key={module.id}
              src={module.image}
              alt={`Samtal ${module.label} interface`}
              className="block w-full rounded-xl object-cover object-left-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
