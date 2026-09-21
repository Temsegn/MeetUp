import { useLandingCopy } from '../useLandingCopy';

export function HowItWorks() {
  const copy = useLandingCopy();

  return (
    <section id="platform" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#016BE6]">
            {copy.steps.eyebrow}
          </p>
          <h2 className="mt-3 text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-0.03em] text-[#0B1220]">
            {copy.steps.title}
          </h2>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#E6EAF0] bg-[#E6EAF0] sm:grid-cols-3">
          {copy.steps.items.map((item) => (
            <li key={item.step} className="bg-white p-7 sm:p-8">
              <p className="text-[12px] font-semibold tracking-[0.18em] text-[#016BE6]">{item.step}</p>
              <h3 className="mt-4 text-[18px] font-semibold text-[#0B1220]">{item.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5A6B7C]">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
