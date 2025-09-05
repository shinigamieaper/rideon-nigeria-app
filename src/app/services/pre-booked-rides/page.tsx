import React from 'react';
import { PreBookedRidesHeroSection, PriceEstimationWidget, HowItWorksSection, UseCaseGallerySection, ComparisonTableSection, FinalCTASection } from '../../../../components';


const PreBookedRidesPage = () => {
  return (
    <main className="overflow-hidden">
      <PreBookedRidesHeroSection>
        <PriceEstimationWidget showDescription={false} />
      </PreBookedRidesHeroSection>
      <HowItWorksSection />
      <UseCaseGallerySection />
      <ComparisonTableSection />
      <FinalCTASection />
    </main>
  );
};

export default PreBookedRidesPage;
