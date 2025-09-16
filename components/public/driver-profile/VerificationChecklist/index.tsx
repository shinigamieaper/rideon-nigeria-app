import React from 'react';
import { CheckCircle } from 'lucide-react';
import BlurText from '../../../shared/BlurText';
import RevealOnScroll from '../../../shared/RevealOnScroll';

const VerificationChecklist: React.FC = () => {
  const verificationItems = [
    'Background Check Passed',
    "Driver's License Verified",
    'LASDRI Card Verified',
    'References Checked',
    'Medical Fitness Confirmed'
  ];

  return (
    <RevealOnScroll 
      as="div"
      className="p-8 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60" 
      style={{
        '--tw-enter-opacity': '0',
        '--tw-enter-translate-y': '1rem',
        '--tw-enter-blur': '8px',
        'animationDelay': '400ms'
      } as React.CSSProperties}
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
        <BlurText as="span" text={"What 'RideOn Verified' Means"} animateBy="words" direction="top" delay={120} />
      </h2>
      <ul className="space-y-3 text-sm">
        {verificationItems.map((item, index) => (
          <li key={index} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <CheckCircle className="w-5 h-5 text-green-500" />
            {item}
          </li>
        ))}
      </ul>
    </RevealOnScroll>
  );
};

export default VerificationChecklist;
