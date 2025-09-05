import React from 'react';
import BlurText from '../../../shared/BlurText';

interface ProfessionalSummaryProps {
  summary: string;
}

const ProfessionalSummary: React.FC<ProfessionalSummaryProps> = ({ summary }) => {
  // Split summary into paragraphs if it contains line breaks or is very long
  const paragraphs = summary.split('\n').filter(p => p.trim().length > 0);
  
  return (
    <div 
      className="p-8 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60 animate-in" 
      style={{
        '--tw-enter-opacity': '0',
        '--tw-enter-translate-y': '1rem',
        '--tw-enter-blur': '8px',
        'animationDelay': '200ms'
      } as React.CSSProperties}
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
        <BlurText as="span" text="Professional Summary" animateBy="words" direction="top" delay={120} />
      </h2>
      <div className="space-y-4 text-slate-600 dark:text-slate-400">
        {paragraphs.length > 1 ? (
          paragraphs.map((paragraph, index) => (
            <BlurText
              key={index}
              as="p"
              text={paragraph}
              animateBy="words"
              direction="top"
              delay={24}
            />
          ))
        ) : (
          <BlurText
            as="p"
            text={summary}
            animateBy="words"
            direction="top"
            delay={24}
          />
        )}
      </div>
    </div>
  );
};

export default ProfessionalSummary;
