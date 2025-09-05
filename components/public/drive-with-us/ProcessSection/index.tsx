import * as React from 'react';
import { UserPlus, ClipboardCheck, ShieldCheck, Car } from 'lucide-react';
import BlurText from '../../../shared/BlurText';

export interface ProcessSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

/**
 * Server Component: ProcessSection (Drive With Us)
 * Timeline illustrating the application process with step icons and gradient connectors.
 */
export default function ProcessSection({ className, background = 'solid', ...rest }: ProcessSectionProps) {
  const baseEnter = {
    ['--tw-enter-opacity' as any]: '0',
    ['--tw-enter-translate-y' as any]: '1rem',
    ['--tw-enter-blur' as any]: '8px',
  } as React.CSSProperties;

  const steps = [
    {
      id: 1,
      title: 'Create Your Account',
      desc: 'Sign up and tell us about your driving experience, license class, and location preferences.',
      Icon: UserPlus,
      delay: '200ms',
    },
    {
      id: 2,
      title: 'Verification & Screening',
      desc: 'We run background checks and verify documents to ensure top-tier safety and professionalism.',
      Icon: ClipboardCheck,
      delay: '300ms',
    },
    {
      id: 3,
      title: 'Onboarding & Standards',
      desc: 'Complete orientation on our service standards, safety protocols, and client expectations.',
      Icon: ShieldCheck,
      delay: '400ms',
    },
    {
      id: 4,
      title: 'Start Driving with RideOn',
      desc: 'Receive pre-booked rides and long-term opportunities. Drive with confidence and predictability.',
      Icon: Car,
      delay: '500ms',
    },
  ];

  const wrapperBgClass =
    background === 'transparent'
      ? 'bg-transparent'
      : background === 'tinted'
        ? 'bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800'
        : 'bg-background';

  return (
    <section className={["py-24 sm:py-32", wrapperBgClass, className].filter(Boolean).join(' ')} {...rest}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center animate-in" style={baseEnter}>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText as="span" text="How the Process Works" animateBy="words" direction="top" delay={120} />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400"
            text="A transparent, driver-first onboarding designed for safety and success."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        <div className="mt-16 lg:mt-20">
          <ol className="relative grid grid-cols-1 gap-10 lg:grid-cols-4">
            {steps.map(({ id, title, desc, Icon, delay }, idx) => (
              <li key={id} className="relative">
                {/* Connector */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] right-[-10%] h-0.5 bg-gradient-to-r from-blue-500/60 via-indigo-500/60 to-emerald-500/60" aria-hidden="true" />
                )}

                <div
                  className="relative flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-8 shadow-lg backdrop-blur-lg animate-in hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
                  style={{ ...baseEnter, animationDelay: delay }}
                >
                  <div className="mb-6 h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                    <BlurText as="span" text={title} animateBy="words" direction="top" delay={120} />
                  </h3>
                  <BlurText
                    as="p"
                    className="mt-2 text-slate-600 dark:text-slate-400"
                    text={desc}
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                  <div className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Step {id}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
