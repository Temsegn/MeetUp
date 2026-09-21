import { useLandingCopy } from '../useLandingCopy';

export function GlobalPresence() {
  const copy = useLandingCopy();

  return (
    <section className="bg-[#0B1220] py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7EB6FF]">
          {copy.global.eyebrow}
        </p>
        <h2 className="mt-3 max-w-3xl text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-0.03em]">
          {copy.global.title}
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#9AA8B5]">{copy.global.body}</p>
        <div className="mt-12 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
          {copy.global.regions.map((region) => (
            <div key={region.name}>
              <p className="text-[13px] font-semibold tracking-[0.08em] text-white">{region.name}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#9AA8B5]">{region.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
