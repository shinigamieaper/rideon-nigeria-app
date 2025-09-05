import * as React from 'react';
import { CorporateHeroSection, PainPointSolutionSection, LeadFormSection } from '../../../../components';

export default function CorporateSolutionsPage() {
  return (
    <main>
      <CorporateHeroSection />
      <PainPointSolutionSection background="tinted" />
      <LeadFormSection background="transparent" />
    </main>
  );
}
