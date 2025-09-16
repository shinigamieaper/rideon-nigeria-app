import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import BlurText from '../../../shared/BlurText';
import RevealOnScroll from '../../../shared/RevealOnScroll';

interface ProfileHeaderProps {
  driver: {
    firstName: string;
    lastName: string;
    headline: string;
    imageUrl: string;
  };
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ driver }) => {
  const displayName = `${driver.firstName} ${driver.lastName.charAt(0)}.`;
  
  return (
    <RevealOnScroll
      as="div"
      className="flex flex-col sm:flex-row items-center gap-6"
      style={{
        '--tw-enter-opacity': '0',
        '--tw-enter-translate-y': '1rem',
        '--tw-enter-blur': '8px',
        'animationDelay': '100ms'
      } as React.CSSProperties}
    >
      <img 
        className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg" 
        src={driver.imageUrl} 
        alt={displayName}
      />
      <div className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          <BlurText as="span" text={displayName} animateBy="words" direction="top" delay={120} />
        </h1>
        <BlurText
          as="p"
          className="mt-1 text-lg text-slate-600 dark:text-slate-400"
          text={driver.headline}
          animateBy="words"
          direction="top"
          delay={24}
        />
        <div className="mt-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white bg-green-600">
            <CheckCircle2 className="w-5 h-5" />
            RideOn Verified
          </span>
        </div>
      </div>
    </RevealOnScroll>
  );
};

export default ProfileHeader;
