import { ShieldCheck, Clock4, Gem, Users2 } from 'lucide-react';
import BlurText from '../../../shared/BlurText';

type CoreValuesSectionProps = Record<string, never>;

const CoreValuesSection: React.FC<CoreValuesSectionProps> = () => {
  const values = [
    {
      icon: <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />,
      title: 'Unwavering Safety',
      description: 'From rigorous driver vetting to meticulous vehicle standards, the safety of our clients and drivers is the bedrock of our service. It is a responsibility we never delegate.',
      bgClass: 'bg-blue-100 dark:bg-blue-950/50',
      delay: '200ms',
    },
    {
      icon: <Clock4 className="h-8 w-8 text-green-600 dark:text-green-400" strokeWidth={1.5} />,
      title: 'Absolute Reliability',
      description: 'We respect your time. Our pre-booking model is architected to deliver on one simple promise: we are there when we say we will be. Every time.',
      bgClass: 'bg-green-100 dark:bg-green-950/50',
      delay: '300ms',
    },
    {
      icon: <Gem className="h-8 w-8 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />,
      title: 'Professional Integrity',
      description: 'We operate with transparency and fairness. From our fixed pricing to our driver contracts, we believe in building relationships founded on mutual respect and trust.',
      bgClass: 'bg-indigo-100 dark:bg-indigo-950/50',
      delay: '400ms',
    },
    {
      icon: <Users2 className="h-8 w-8 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />,
      title: 'Community Focus',
      description: 'We are proudly Nigerian. We are committed to creating sustainable career opportunities for professional drivers and contributing positively to the economic fabric of Lagos.',
      bgClass: 'bg-amber-100 dark:bg-amber-950/50',
      delay: '500ms',
    },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/70 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl animate-in" style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem' } as React.CSSProperties}>
            <BlurText as="span" text="Our Core Values" animateBy="words" direction="top" delay={120} />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400 animate-in"
            text="The principles that guide every decision we make and every ride we complete."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-center sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
          {values.map((value) => (
            <div key={value.title} className="flex flex-col items-center p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl animate-in" style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '2rem', animationDelay: value.delay } as React.CSSProperties}>
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ${value.bgClass}`}>
                {value.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                <BlurText as="span" text={value.title} animateBy="words" direction="top" delay={120} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                text={value.description}
                animateBy="words"
                direction="top"
                delay={24}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoreValuesSection;
