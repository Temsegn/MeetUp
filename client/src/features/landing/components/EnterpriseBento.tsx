import { KeyRound, Lock, Mail, Shield, ShieldCheck, Users } from 'lucide-react';
import { LP_BODY, LP_EYEBROW, LP_H2, LP_SECTION } from '../landing-ui';
import { useLandingCopy } from '../useLandingCopy';

const ICONS = [Lock, Mail, Shield, ShieldCheck, Users, KeyRound] as const;

export function EnterpriseBento() {
  const copy = useLandingCopy();

  return (
    <section id="security" className={`${LP_SECTION} bg-white`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className={LP_EYEBROW}>{copy.security.eyebrow}</p>
          <h2 className={`mt-3 ${LP_H2}`}>{copy.security.title}</h2>
          <p className={`mt-4 ${LP_BODY}`}>{copy.security.body}</p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#E6EBF2] bg-[#E6EBF2] sm:grid-cols-2 lg:grid-cols-3">
          {copy.security.items.map((item, i) => {
            const Icon = ICONS[i] ?? Shield;
            return (
              <article key={item.title} className="bg-white p-6 sm:p-7">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#016BE6]">
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-[#0F172A]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#5B677A]">{item.body}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-6 max-w-3xl text-[12px] leading-relaxed text-[#94A3B8]">{copy.security.footnote}</p>
      </div>
    </section>
  );
}
