import { FC } from 'react';
import { Award, FileCheck2, ScanFace, ShieldCheck, HeartPulse, Users } from 'lucide-react';
import BlurText from '../../shared/BlurText';

const complianceItems = [
  {
    icon: <Award className="h-6 w-6" style={{ strokeWidth: 1.5 }} />,
    title: "Valid Driver's License",
    delay: '300ms',
  },
  {
    icon: <FileCheck2 className="h-6 w-6" style={{ strokeWidth: 1.5 }} />,
    title: 'LASDRI Certification',
    delay: '400ms',
  },
  {
    icon: <ScanFace className="h-6 w-6" style={{ strokeWidth: 1.5 }} />,
    title: 'Background Check',
    delay: '500ms',
  },
  {
    icon: <ShieldCheck className="h-6 w-6" style={{ strokeWidth: 1.5 }} />,
    title: 'Defensive Driving',
    delay: '600ms',
  },
  {
    icon: <HeartPulse className="h-6 w-6" style={{ strokeWidth: 1.5 }} />,
    title: 'Medical Fitness',
    delay: '700ms',
  },
  {
    icon: <Users className="h-6 w-6" style={{ strokeWidth: 1.5 }} />,
    title: 'Guarantor Verification',
    delay: '800ms',
  },
];

const ComplianceSection: FC = () => {
  return (
    <section className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div
            className="animate-in"
            style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', '--tw-enter-blur': '8px', animationDelay: '200ms' } as React.CSSProperties}
          >
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              <BlurText as="span" text="Your Compliance Partner" animateBy="words" direction="top" delay={120} />
            </h2>
            <BlurText
              as="p"
              className="mt-4 text-lg text-slate-600 dark:text-slate-400"
              text="We manage the complexities of driver employment so you don't have to. Every driver in our marketplace meets stringent requirements for your safety and peace of mind."
              animateBy="words"
              direction="top"
              delay={24}
            />
            <BlurText
              as="p"
              className="mt-4 text-slate-600 dark:text-slate-400"
              text="Our process is your protection, ensuring every driver is not just skilled, but also verified, certified, and ready to represent you or your company with professionalism."
              animateBy="words"
              direction="top"
              delay={24}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {complianceItems.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl bg-white/50 dark:bg-slate-800/50 p-6 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-700/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out animate-in"
                style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', '--tw-enter-blur': '8px', animationDelay: item.delay } as React.CSSProperties}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  <BlurText as="span" text={item.title} animateBy="words" direction="top" delay={120} />
                </h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComplianceSection;
