import { useAuth } from '../../../contexts/AuthContext';
import { EnterpriseBento } from '../components/EnterpriseBento';
import { GlobalPresence } from '../components/GlobalPresence';
import { HowItWorks } from '../components/HowItWorks';
import { LandingCta, LandingFooter } from '../components/LandingFooter';
import { LandingHero } from '../components/LandingHero';
import { PricingTeaser } from '../components/PricingTeaser';
import { ProductModuleStrip } from '../components/ProductModuleStrip';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div>
      <main>
        <LandingHero user={user} />
        <ProductModuleStrip />
        <HowItWorks />
        <EnterpriseBento />
        <GlobalPresence />
        <PricingTeaser user={user} />
        <LandingCta user={user} />
      </main>
      <LandingFooter />
    </div>
  );
}
