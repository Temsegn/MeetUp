import { LP_BODY, LP_CARD, LP_EYEBROW, LP_H2, LP_SECTION } from '../landing-ui';
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
        <ol className="mt-10 grid gap-3 sm:grid-cols-3">
          {copy.steps.items.map((item) => (
            <li key={item.step} className={`${LP_CARD} p-6 sm:p-7`}>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#E8F1FE] text-[12px] font-bold text-[#016BE6]">
                {item.step}
              </span>
              <h3 className="mt-4 text-[17px] font-bold text-[#151D2B]">{item.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6F7B8C]">{item.body}</p>
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
    <section id="workspace" className={`${LP_SECTION} bg-[#F5F7FA]`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.workspace.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.workspace.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.workspace.body}</p>
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {copy.workspace.items.map((item) => (
            <li key={item.title} className={`${LP_CARD} p-5`}>
              <h3 className="text-[15px] font-semibold text-[#151D2B]">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#6F7B8C]">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
