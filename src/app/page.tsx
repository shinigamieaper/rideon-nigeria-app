// e.g., src/app/page.tsx

import { HeroSection, PriceEstimationWidget, ServicePillarsSection, SocialProofSection, WhyRideOnSection } from "../../components";


export default function HomePage() {
  return (
    <>
      <HeroSection>
        <PriceEstimationWidget />
      </HeroSection>
      <ServicePillarsSection background="tinted" />
      <WhyRideOnSection background="transparent" />
      <SocialProofSection background="tinted" />
  
    </>
  );
}