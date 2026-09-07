import React from 'react';

/** Exact paths from Forgot Password design; strokes use sign-in brand blue. */
const BRAND = '#006DEC';
const MUTED = '#62748E';
const ON_PRIMARY = '#FAFCFE';

export const EmailIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M16.1053 5.12427L9.52329 9.3168C9.29993 9.44653 9.04623 9.51486 8.78793 9.51486C8.52963 9.51486 8.27593 9.44653 8.05257 9.3168L1.46399 5.12427"
      stroke={MUTED}
      strokeWidth="1.46"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.6411 2.92798H2.92812C2.1195 2.92798 1.46399 3.58349 1.46399 4.39211V13.1769C1.46399 13.9855 2.1195 14.641 2.92812 14.641H14.6411C15.4498 14.641 16.1053 13.9855 16.1053 13.1769V4.39211C16.1053 3.58349 15.4498 2.92798 14.6411 2.92798Z"
      stroke={MUTED}
      strokeWidth="1.46"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SendIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M2.71847 2.23153C2.65263 2.19939 2.57863 2.18783 2.50612 2.19837C2.43362 2.2089 2.36597 2.24104 2.31199 2.29059C2.25802 2.34013 2.22023 2.40479 2.20355 2.47614C2.18686 2.54748 2.19206 2.62219 2.21847 2.69054L4.29973 8.27399C4.42248 8.60359 4.42248 8.96636 4.29973 9.29595L2.2192 14.8794C2.19293 14.9477 2.1878 15.0223 2.20447 15.0935C2.22115 15.1647 2.25885 15.2292 2.3127 15.2787C2.36654 15.3282 2.43403 15.3604 2.5064 15.371C2.57876 15.3817 2.65265 15.3703 2.71847 15.3384L15.8956 9.11587C15.9583 9.08622 16.0113 9.03938 16.0484 8.9808C16.0855 8.92222 16.1052 8.85431 16.1052 8.78497C16.1052 8.71564 16.0855 8.64772 16.0484 8.58914C16.0113 8.53056 15.9583 8.48373 15.8956 8.45408L2.71847 2.23153Z"
      stroke={ON_PRIMARY}
      strokeWidth="1.46"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.39233 8.78491H16.1054"
      stroke={ON_PRIMARY}
      strokeWidth="1.46"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BackArrowIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M8.78644 13.9093L3.66199 8.78485L8.78644 3.6604"
      stroke={BRAND}
      strokeWidth="1.46"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.9109 8.78467H3.66199"
      stroke={BRAND}
      strokeWidth="1.46"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ShieldIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M18.3023 11.8964C18.3023 16.4718 15.0995 18.7595 11.2928 20.0863C11.0934 20.1539 10.8769 20.1507 10.6797 20.0772C6.86379 18.7595 3.66101 16.4718 3.66101 11.8964V5.49081C3.66101 5.24812 3.75742 5.01536 3.92903 4.84375C4.10064 4.67214 4.3334 4.57573 4.57609 4.57573C6.40625 4.57573 8.69395 3.47763 10.2862 2.08671C10.4801 1.92108 10.7267 1.83008 10.9817 1.83008C11.2366 1.83008 11.4833 1.92108 11.6772 2.08671C13.2694 3.47763 15.5571 4.57573 17.3873 4.57573C17.63 4.57573 17.8627 4.67214 18.0343 4.84375C18.206 5.01536 18.3023 5.24812 18.3023 5.49081V11.8964Z"
      stroke={BRAND}
      strokeWidth="1.83"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.23535 10.9812L10.0655 12.8113L13.7258 9.15112"
      stroke={BRAND}
      strokeWidth="1.83"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CalendarIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M7.31982 1.83008V5.4904" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.642 1.83008V5.4904" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M17.3864 3.66064H4.57528C3.56451 3.66064 2.74512 4.48004 2.74512 5.49081V18.3019C2.74512 19.3127 3.56451 20.1321 4.57528 20.1321H17.3864C18.3972 20.1321 19.2166 19.3127 19.2166 18.3019V5.49081C19.2166 4.48004 18.3972 3.66064 17.3864 3.66064Z"
      stroke={BRAND}
      strokeWidth="1.83"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2.74512 8.23535H19.2166" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.23535 12.8113H10.0655" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.9812 12.8113V15.5571" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SupportIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M10.9802 20.1314C16.034 20.1314 20.131 16.0345 20.131 10.9806C20.131 5.92679 16.034 1.82983 10.9802 1.82983C5.9263 1.82983 1.82935 5.92679 1.82935 10.9806C1.82935 16.0345 5.9263 20.1314 10.9802 20.1314Z"
      stroke={BRAND}
      strokeWidth="1.83"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4.51025 4.51147L8.3902 8.39142" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17.4502 4.51147L13.5703 8.39142" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.9802 8.23535V11.8957" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.31982 14.6411H14.6413" stroke={BRAND} strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
