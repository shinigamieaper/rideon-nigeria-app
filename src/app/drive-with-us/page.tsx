import React from 'react';
import {
  DriveWithUsHeroSection,
  DriveWithUsBenefitsSection,
  DriveWithUsProcessSection,
  DriveWithUsFinalCTASection,
  SocialProofSection,
} from '../../../components';

const driverTestimonials = [
  {
    id: 1,
    name: 'Ibrahim Musa',
    role: 'Professional Driver',
    initials: 'IM',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    quote:
      "Partnering with RideOn brought stability to my income. Pre-booked jobs mean I can plan my week and support my family with confidence.",
  },
  {
    id: 2,
    name: 'Blessing Okonkwo',
    role: 'Executive Driver',
    initials: 'BO',
    gradient: 'linear-gradient(135deg, #0077E6, #00529B)',
    quote:
      'The onboarding was professional and thorough. I always feel supported, and the clients are respectful and consistent.',
  },
  {
    id: 3,
    name: 'Kunle Adebayo',
    role: 'Driver Partner',
    initials: 'KA',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    quote:
      'RideOn values professionalism. The standards are clear, and I get predictable, quality trips without chasing fares.',
  },
];

export default function DriveWithUsPage() {
  return (
    <main className="overflow-hidden">
      <DriveWithUsHeroSection />
      <DriveWithUsBenefitsSection background="tinted" />
      <DriveWithUsProcessSection background="transparent" />
      <SocialProofSection
        title="Hear From Our Driver Partners"
        subtitle="Real stories from professionals driving with RideOn across Lagos."
        testimonials={driverTestimonials}
        background="tinted"
      />
      <DriveWithUsFinalCTASection background="transparent" />
    </main>
  );
}
