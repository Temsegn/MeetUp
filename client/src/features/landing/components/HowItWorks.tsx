import { LP_BODY, LP_EYEBROW, LP_H2, LP_SECTION } from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';

export function HowItWorks() {
  const copy = useLandingCopy();

  return (
    <section className={`${LP_SECTION} bg-white`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.steps.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.steps.title}</h2>
        </div>
        <ol className="mt-12 grid gap-0 border-t border-[#E6EBF2] sm:grid-cols-3 sm:border-t-0 sm:border-s">
          {copy.steps.items.map((item) => (
            <li
              key={item.step}
              className="border-b border-[#E6EBF2] px-0 py-8 sm:border-b-0 sm:border-e sm:px-8 sm:py-2 first:sm:ps-0 last:sm:border-e-0 last:sm:pe-0"
            >
              <span className="lp-display text-[13px] font-semibold tracking-[0.08em] text-[#016BE6]">
                {item.step}
              </span>
              <h3 className="lp-display mt-4 text-[18px] font-semibold tracking-tight text-[#0F172A]">
                {item.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5B677A]">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function OrganizationSection() {
  const copy = useLandingCopy();

  return (
    <section id="workspace" className={`${LP_SECTION} bg-[#F7F9FC]`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.workspace.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.workspace.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.workspace.body}</p>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#E6EBF2] bg-[#E6EBF2] sm:grid-cols-2">
          {copy.workspace.items.map((item) => (
            <li key={item.title} className="bg-white p-6 sm:p-7">
              <h3 className="text-[15px] font-semibold text-[#0F172A]">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#5B677A]">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
