import { useAuth } from '../../../contexts/AuthContext';
import { EnterpriseBento } from '../components/EnterpriseBento';
import { LandingCta, LandingFooter } from '../components/LandingFooter';
import { LandingHero } from '../components/LandingHero';
import { LandingNav } from '../components/LandingNav';
import { PricingTeaser } from '../components/PricingTeaser';
import { ProductModuleStrip } from '../components/ProductModuleStrip';
import { SocialProof } from '../components/SocialProof';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="samtal-light min-h-dvh bg-white font-sans text-[#151D2B] antialiased">
      <LandingNav user={user} />
      <main>
        <LandingHero user={user} />
        <ProductModuleStrip />
        <EnterpriseBento />
        <SocialProof />
        <PricingTeaser user={user} />
        <LandingCta user={user} />
      </main>
      <LandingFooter />
    </div>
  );
}
