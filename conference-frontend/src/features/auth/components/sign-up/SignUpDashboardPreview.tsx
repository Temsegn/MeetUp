import React from 'react';
import { AUTH_ASSETS } from '../../constants/auth.assets';

/**
 * Dashboard mock — soft diffused blue shadow like Figma (no hard edge).
 */
export const SignUpDashboardPreview: React.FC = () => (
  <div className="relative w-full max-w-[32rem] self-start pb-6" aria-hidden>
    {/* Wide soft under-glow matching Figma (smooth, light blue-gray) */}
    <div
      className="pointer-events-none absolute bottom-0 left-[6%] right-[4%] h-14 rounded-[100%] bg-[rgba(70,110,160,0.22)] blur-[28px]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute bottom-1 left-[14%] right-[10%] h-8 rounded-[100%] bg-[rgba(30,60,120,0.1)] blur-[18px]"
      aria-hidden
    />
    <img
      src={AUTH_ASSETS.signUpDashboard}
      alt=""
      className="relative z-[1] block h-auto w-full max-h-[min(30vh,15.5rem)] object-contain object-left [mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)] [filter:drop-shadow(0_18px_40px_rgba(30,60,120,0.16))]"
    />
  </div>
);
