import React from 'react';
import Link from 'next/link';
import RevealOnScroll from '../../../shared/RevealOnScroll';

const ConversionSidebar: React.FC = () => {
  return (
    <RevealOnScroll 
      as="div"
      className="lg:sticky lg:top-24 h-fit" 
      style={{
        '--tw-enter-opacity': '0',
        '--tw-enter-translate-y': '1rem',
        '--tw-enter-blur': '8px',
        'animationDelay': '600ms'
      } as React.CSSProperties}
    >
      <div className="p-8 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60 text-center">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          Interested in hiring Bayo?
        </h3>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
          Create a free account to request an interview and start the conversation.
        </p>
        <Link 
          href="/register/customer"
          className="mt-6 inline-flex items-center justify-center w-full rounded-lg text-base font-semibold text-white h-12 px-6 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30 bg-[#00529B]"
        >
          Request an Interview
        </Link>
      </div>
    </RevealOnScroll>
  );
};

export default ConversionSidebar;
