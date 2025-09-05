'use client';

import Link from "next/link";
import { ArrowRight, HelpCircle, Mail, Shield } from "lucide-react";
import BlurText from "../../../components/shared/BlurText";

export const dynamic = "force-static";

export default function SupportIndexPage() {
  return (
    <div className=" text-foreground">
      {/* Hero */}
      <div className="relative isolate overflow-hidden">
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 lg:px-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
            <BlurText as="span" text="Help & Support Center" animateBy="words" direction="top" delay={120} />
          </h1>
        </div>
      </div>

      {/* Cards */}
      <main className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* FAQs */}
            <Link
              href="/support/faq"
              className="group block p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <HelpCircle className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  <BlurText as="span" text="Frequently Asked Questions" animateBy="words" direction="top" delay={100} />
                </h2>
                <p className="text-sm/6 text-foreground/70 flex-grow">
                  <BlurText as="span" text="Find answers to common questions about our platform, services, and policies." animateBy="words" direction="top" delay={24} />
                </p>
                <div className="mt-6 flex items-center text-sm font-medium text-blue-400">
                  Explore FAQs
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </div>
              </div>
            </Link>

            {/* Contact */}
            <Link
              href="/support/contact"
              className="group block p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <Mail className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  <BlurText as="span" text="Contact Support" animateBy="words" direction="top" delay={100} />
                </h2>
                <p className="text-sm/6 text-foreground/70 flex-grow">
                  <BlurText as="span" text="Get in touch with our support team for personalized assistance." animateBy="words" direction="top" delay={24} />
                </p>
                <div className="mt-6 flex items-center text-sm font-medium text-blue-400">
                  Get Help
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </div>
              </div>
            </Link>

            {/* Safety */}
            <Link
              href="/support/safety"
              className="group block p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <Shield className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  <BlurText as="span" text="Safety Information" animateBy="words" direction="top" delay={100} />
                </h2>
                <p className="text-sm/6 text-foreground/70 flex-grow">
                  <BlurText as="span" text="Learn about our safety protocols and how to protect your account." animateBy="words" direction="top" delay={24} />
                </p>
                <div className="mt-6 flex items-center text-sm font-medium text-blue-400">
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
