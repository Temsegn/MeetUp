import { LANDING_ASSETS, TRUST_LOGOS } from '../constants/landing.constants';

export function SocialProof() {
  return (
    <section className="border-y border-[#E8ECF1] bg-[#F8FAFC] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A94A6]">
          Trusted by modern teams
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TRUST_LOGOS.map((name) => (
            <span
              key={name}
              className="text-[15px] font-bold tracking-tight text-[#CBD5E1] sm:text-[16px]"
            >
              {name}
            </span>
          ))}
        </div>

        <figure className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#E8ECF1] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] sm:p-8">
          <blockquote className="text-[16px] font-medium leading-relaxed text-[#151D2B] sm:text-[18px]">
            “We replaced three tools with Samtal. Meetings, follow-up chat, and recordings now live
            in one place — our team actually uses all of it.”
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <img
              src={LANDING_ASSETS.avatarQuote}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-[#E8F1FF]"
            />
            <div>
              <p className="text-[14px] font-semibold text-[#151D2B]">Leslie Alexander</p>
              <p className="text-[12px] text-[#8A94A6]">Design Lead, Product Team</p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
