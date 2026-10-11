import { Building2, CreditCard, Mail, Users } from 'lucide-react';
import { LandingBlueWash, LP_BODY, LP_CARD, LP_EYEBROW, LP_H2, LP_ICON, LP_SECTION_SOFT, LP_SECTION_WHITE } from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';

export function HowItWorks() {
  const copy = useLandingCopy();

  return (
    <section className={LP_SECTION_WHITE}>
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.steps.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.steps.title}</h2>
        </div>
        <ol className="mt-12 grid gap-4 sm:grid-cols-3">
          {copy.steps.items.map((item) => (
            <li key={item.step} className={`${LP_CARD} p-6 sm:p-7`}>
              <span className="lp-display inline-flex size-10 items-center justify-center rounded-full bg-[#EAF2FF] text-[13px] font-bold text-[#016BE6]">
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

const ORG_ICONS = [Users, Building2, Mail, CreditCard] as const;

export function OrganizationSection() {
  const copy = useLandingCopy();

  return (
    <section id="workspace" className={LP_SECTION_SOFT}>
      <LandingBlueWash variant="light" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.workspace.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.workspace.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.workspace.body}</p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {copy.workspace.items.map((item, i) => {
            const Icon = ORG_ICONS[i] ?? Users;
            return (
              <li key={item.title} className={`${LP_CARD} p-6 sm:p-7`}>
                <span className={LP_ICON}>
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-[#0F172A]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#5B677A]">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
