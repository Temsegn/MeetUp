import { useLandingCopy } from '../useLandingCopy';

export function EnterpriseBento() {
  const copy = useLandingCopy();

  return (
    <section id="security" className="bg-[#F6F8FB] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#016BE6]">
            {copy.security.eyebrow}
          </p>
          <h2 className="mt-3 text-[clamp(1.65rem,3vw,2.35rem)] font-semibold tracking-[-0.03em] text-[#0B1220]">
            {copy.security.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#5A6B7C]">{copy.security.body}</p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#E6EAF0] bg-[#E6EAF0] sm:grid-cols-2 lg:grid-cols-3">
          {copy.security.items.map((item) => (
            <article key={item.title} className="bg-white p-6 sm:p-7">
              <h3 className="text-[15px] font-semibold text-[#0B1220]">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#5A6B7C]">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-[12px] leading-relaxed text-[#8A96A3]">{copy.security.footnote}</p>
      </div>
    </section>
  );
}
