import { FC } from 'react';
import { HireDriverComplianceSection, HireDriverFinalCTASection, HireDriverHeroSection, SocialProofSection } from '../../../../components';


const testimonials = [
  {
    id: 1,
    name: 'The Adebayo Family',
    location: 'Lekki, Lagos',
    initials: 'AF',
    gradient: 'linear-gradient(135deg, #0077E6, #00529B)',
    quote: 'Hiring a full-time driver through RideOn was the best decision for our family. The vetting process gave us immense peace of mind, and our driver is professional, punctual, and wonderful with the kids. It’s security and convenience in one package.',
  },
  {
    id: 2,
    name: 'Ifeanyi Chukwu',
    location: 'Business Owner, Ikeja',
    initials: 'IC',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    quote: "I needed a dedicated driver for my daily commute and client meetings. RideOn's marketplace made it easy to find a perfect match. The entire process, from browsing profiles to finalizing the hire, was seamless and professional. Highly recommended.",
  },
  {
    id: 3,
    name: 'Dr. Amina Bello',
    location: 'Medical Professional, Victoria Island',
    initials: 'AB',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    quote: 'The level of detail in the driver background checks is impressive. Knowing that RideOn handles compliance, medical fitness, and guarantor verification allowed me to hire with confidence. The service is transparent and trustworthy.',
  },
];

const HireADriverPage: FC = () => {
  return (
    <main className="overflow-hidden">
      <HireDriverHeroSection />
      <HireDriverComplianceSection />
      <SocialProofSection 
        title="Trusted by Families & Professionals"
        subtitle="See what our clients have to say about hiring a full-time driver with RideOn."
        testimonials={testimonials}
        background="transparent"
      />
      <HireDriverFinalCTASection />
    </main>
  );
};

export default HireADriverPage;
