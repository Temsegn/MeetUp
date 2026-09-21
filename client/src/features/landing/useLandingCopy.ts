import { useLandingLocale } from './landing-locale';
import { LANDING_COPY } from './constants/landing.constants';

export function useLandingCopy() {
  const { locale } = useLandingLocale();
  return LANDING_COPY[locale];
}
