"use client";
import Link from 'next/link';
import type { CSSProperties } from 'react';
import BlurText from '../../shared/BlurText';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  type CSSVars = CSSProperties & { [key: `--${string}`]: string | number };

  return (
    <footer className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800/50">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Brand & Newsletter */}
          <div className="flex-1 min-w-[240px] max-w-md mb-8 lg:mb-0 animate-in" style={{"--tw-enter-opacity": "0", "--tw-enter-translate-y": "1rem", "--tw-enter-blur": "8px", "animationDelay": "100ms"} as CSSVars}>
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tighter text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 mb-5">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 16H9m10 0h3m-3-3.5a3.5 3.5 0 1 1-7 0v-9a3.5 3.5 0 1 1 7 0V16Z"/>
                <path d="M4 15.5V8a3.5 3.5 0 0 1 7 0v8"/>
                <path d="M2 16h3m3 0h2"/>
              </svg>
              <BlurText as="span" text="RideOn Nigeria" animateBy="words" direction="top" delay={60} />
            </Link>
            <BlurText
              as="p"
              className="mt-3 text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-7"
              text="Get the latest updates, special offers, and insights on professional transport in Nigeria. Join our community."
              animateBy="words"
              direction="top"
              delay={20}
            />
            <form className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input 
                  type="email" 
                  required 
                  placeholder="Your email" 
                  className="w-full h-11 pr-4 pl-11 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/20 group whitespace-nowrap w-full sm:w-auto"
              >
                <BlurText as="span" text="Subscribe" animateBy="letters" direction="top" delay={16} childClassName="whitespace-nowrap" />
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </button>
            </form>
            <BlurText as="span" className="block mt-2 text-xs text-slate-500 dark:text-slate-500" text="No spam. Unsubscribe anytime." animateBy="words" direction="top" delay={10} />
          </div>

          {/* Footer Navigation */}
          <div className="flex-1 flex flex-wrap gap-10 lg:gap-16 justify-between">
            {/* Services Links */}
            <div className="animate-in" style={{"--tw-enter-opacity": "0", "--tw-enter-translate-y": "1rem", "--tw-enter-blur": "8px", "animationDelay": "200ms"} as CSSVars}>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 tracking-tight text-base">
                <BlurText as="span" text="Services" animateBy="letters" direction="top" delay={16} />
              </h4>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
                <li><Link href="/services/pre-booked-rides" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Pre-Booked Rides" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/services/hire-a-driver" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Hire a Driver" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/solutions/corporate" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Corporate Solutions" animateBy="letters" direction="top" delay={12} /></Link></li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div className="animate-in" style={{"--tw-enter-opacity": "0", "--tw-enter-translate-y": "1rem", "--tw-enter-blur": "8px", "animationDelay": "300ms"} as CSSVars}>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 tracking-tight text-base">
                <BlurText as="span" text="Company" animateBy="letters" direction="top" delay={16} />
              </h4>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
                <li><Link href="/about" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="About Us" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/drive-with-us" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Drive With Us" animateBy="letters" direction="top" delay={12} /></Link></li>
              </ul>
            </div>
            
            {/* Support Links */}
            <div className="animate-in" style={{"--tw-enter-opacity": "0", "--tw-enter-translate-y": "1rem", "--tw-enter-blur": "8px", "animationDelay": "400ms"} as CSSVars}>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 tracking-tight text-base">
                <BlurText as="span" text="Support" animateBy="letters" direction="top" delay={16} />
              </h4>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
                <li><Link href="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Help Center" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/support/contact" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Contact Us" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/support/safety" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Safety" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/support/faq" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="FAQ" animateBy="letters" direction="top" delay={12} /></Link></li>
              </ul>
            </div>
            
            {/* Legal Links */}
            <div className="animate-in" style={{"--tw-enter-opacity": "0", "--tw-enter-translate-y": "1rem", "--tw-enter-blur": "8px", "animationDelay": "500ms"} as CSSVars}>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 tracking-tight text-base">
                <BlurText as="span" text="Legal" animateBy="letters" direction="top" delay={16} />
              </h4>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Privacy Policy" animateBy="letters" direction="top" delay={12} /></Link></li>
                <li><Link href="/terms-of-service" className="hover:text-slate-900 dark:hover:text-white transition-colors"><BlurText as="span" className="inline-block" text="Terms of Service" animateBy="letters" direction="top" delay={12} /></Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="mt-12 mb-8 w-full h-px bg-slate-200 dark:bg-slate-800"></div>
        
        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 animate-in" style={{"--tw-enter-opacity": "0", "--tw-enter-translate-y": "1rem", "--tw-enter-blur": "8px", "animationDelay": "600ms"} as CSSVars}>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <BlurText as="span" text={`© ${currentYear} RideOn Nigeria. All rights reserved.`} animateBy="words" direction="top" delay={20} />
          </div>
          <div className="flex items-center gap-4">
            <Link href="https://twitter.com/rideon_nigeria" className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
              </svg>
            </Link>
            <Link href="https://instagram.com/rideon_nigeria" className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </Link>
            <Link href="https://facebook.com/rideon.nigeria" className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" aria-label="Facebook">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </Link>
            <Link href="https://linkedin.com/company/rideon-nigeria" className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" aria-label="LinkedIn">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect width="4" height="12" x="2" y="9"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

