import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Car, Briefcase, CheckCircle2 } from "lucide-react";
import {
  DriveWithUsHeroSection,
  DriveWithUsBenefitsSection,
  DriveWithUsProcessSection,
  BlurText,
} from "../../../components";

export const metadata: Metadata = {
  title: "Drive With Us | RideOn Nigeria",
  description:
    "Join RideOn as a professional driver. Choose between on-demand driving or full-time driver recruitment opportunities.",
};

export default function DriveWithUsPage() {
  return (
    <main className="overflow-hidden">
      <DriveWithUsHeroSection backgroundImageUrl="/hire-a-driver-pillar.png" />

      {/* Driver Tracks Section */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="Choose Your Driver Track"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="We offer two pathways for professional drivers to join RideOn."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* On-Demand Track */}
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-8">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4">
                <Car className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">
                <BlurText
                  as="span"
                  text="On-Demand Driver"
                  animateBy="words"
                  direction="top"
                  delay={100}
                />
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                <BlurText
                  as="span"
                  text="Register as a platform driver to accept on-demand Drive My Car trips. Earn per completed trip with flexible availability."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Flexible availability (go online/offline)",
                  "Earn per completed trip",
                  "Clear trip details and support",
                  "Professional standards and verification",
                  "Build trust with ratings and feedback",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      <BlurText
                        as="span"
                        text={item}
                        animateBy="words"
                        direction="top"
                        delay={24}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register/driver/on-demand"
                className="inline-flex w-full items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600"
              >
                <BlurText
                  as="span"
                  text="Start On-Demand Registration"
                  animateBy="letters"
                  direction="top"
                  delay={18}
                />
              </Link>
            </div>

            {/* Full-Time Recruitment Track */}
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-8">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
                <Briefcase className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">
                <BlurText
                  as="span"
                  text="Full-Time Driver Recruitment"
                  animateBy="words"
                  direction="top"
                  delay={100}
                />
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                <BlurText
                  as="span"
                  text="Apply to be vetted for full-time recruitment opportunities. Get matched with families and professionals seeking dedicated drivers."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Full-time employment opportunities",
                  "Rigorous vetting process",
                  "Direct placement with employers",
                  "Long-term stability",
                  "Background verification",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      <BlurText
                        as="span"
                        text={item}
                        animateBy="words"
                        direction="top"
                        delay={24}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register/driver/full-time"
                className="inline-flex w-full items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600"
              >
                <BlurText
                  as="span"
                  text="Apply for Full-Time Recruitment"
                  animateBy="letters"
                  direction="top"
                  delay={18}
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <DriveWithUsBenefitsSection background="tinted" />
      <DriveWithUsProcessSection background="transparent" />
    </main>
  );
}
