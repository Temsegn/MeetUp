import React from 'react';

type Props = {
  iconSrc: string;
  title: string;
  description: string;
};

/** Compact feature row for one-viewport signup left panel. */
export const SignUpFeatureItem: React.FC<Props> = ({ iconSrc, title, description }) => (
  <div className="flex w-full items-start gap-2.5">
    <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-[0_3px_10px_rgba(30,60,120,0.12)]">
      <img src={iconSrc} alt="" width={14} height={14} className="block size-3.5" />
    </div>
    <div className="min-w-0 pt-0.5">
      <h3 className="m-0 text-[0.75rem] font-bold leading-snug text-[#161E35]">{title}</h3>
      <p className="mt-0.5 max-w-[18rem] text-[0.6875rem] leading-snug text-[rgba(22,30,53,0.65)]">
        {description}
      </p>
    </div>
  </div>
);
