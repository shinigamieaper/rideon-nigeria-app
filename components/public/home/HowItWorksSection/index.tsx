"use client";

import * as React from "react";
import BlurText from "../../../shared/BlurText";
import RevealOnScroll from "../../../shared/RevealOnScroll";

export interface HowItWorksSectionProps
  extends React.ComponentPropsWithoutRef<"section"> {
  /** Controls the section background treatment */
  background?: "solid" | "tinted" | "transparent";
}

interface Step {
  id: number;
  title: string;
  description: string;
  bullets: string[];
}

const steps: Step[] = [
  {
    id: 1,
    title: "Browse Our Fleet",
    description:
      "Explore our curated selection of vehicles – from sleek sedans to spacious SUVs. Filter by category, price, or availability.",
    bullets: [
      "Choose a vehicle that fits your occasion",
      "See transparent pricing and availability",
      "Book in minutes",
    ],
  },
  {
    id: 2,
    title: "Pick Your Dates",
    description:
      "Select your pickup date, time, and duration. Choose a daily or half-day rental that fits your schedule.",
    bullets: [
      "Select start date and time",
      "Choose half‑day, full‑day, or multi‑day",
      "Add pickup details",
    ],
  },
  {
    id: 3,
    title: "Confirm & Pay",
    description:
      "Review your booking details, see the all-inclusive price, and pay securely. No hidden fees, ever.",
    bullets: [
      "Review vehicle, schedule, and pickup details",
      "Confirm your reservation",
      "Get instant confirmation and updates",
    ],
  },
  {
    id: 4,
    title: "Enjoy Your Ride",
    description:
      "Your professional driver arrives with your vehicle at the scheduled time. Sit back, relax, and enjoy your journey.",
    bullets: [
      "Professional driver arrives on schedule",
      "Comfortable, safe journey",
      "Support available if you need help",
    ],
  },
];

/**
 * HowItWorksSection
 *
 * A stepped process section with phone mockups showing app screenshots.
 * Uses the shared PhoneMockup component with images.
 */
export default function HowItWorksSection({
  className,
  background = "solid",
  ...rest
}: HowItWorksSectionProps) {
  const [activeStep, setActiveStep] = React.useState(0);
  const selectedStep = steps[activeStep];

  const baseEnter = {
    "--tw-enter-opacity": "0",
    "--tw-enter-translate-y": "1rem",
    "--tw-enter-blur": "8px",
  } as React.CSSProperties;

  const wrapperBgClass =
    background === "transparent"
      ? "bg-transparent"
      : background === "tinted"
        ? "bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800"
        : "bg-background";

  return (
    <section
      className={["py-24 sm:py-32", wrapperBgClass, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <RevealOnScroll
          as="div"
          className="mx-auto max-w-2xl text-center"
          style={baseEnter}
        >
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText
              as="span"
              text="How It Works"
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400"
            text="Booking a premium rental has never been easier. Four simple steps to your next reservation."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </RevealOnScroll>

        {/* Content: Steps + Phone Mockup */}
        <div className="mt-16 lg:mt-20 flex flex-col lg:flex-row lg:items-start lg:gap-16">
          {/* Left: Steps list */}
          <div className="flex-1 space-y-6">
            {steps.map((step, idx) => (
              <RevealOnScroll
                key={step.id}
                as="div"
                style={{ ...baseEnter, animationDelay: `${200 + idx * 100}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={[
                    "w-full text-left rounded-2xl border p-6 transition-all duration-300",
                    activeStep === idx
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-lg scale-[1.02]"
                      : "border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number */}
                    <div
                      className={[
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                        activeStep === idx
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {step.id}
                    </div>
                    <div>
                      <h3
                        className={[
                          "text-lg font-semibold transition-colors",
                          activeStep === idx
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-slate-900 dark:text-white",
                        ].join(" ")}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
              </RevealOnScroll>
            ))}
          </div>

          {/* Right: Phone Mockup */}
          <RevealOnScroll
            as="div"
            className="flex-shrink-0 mt-12 lg:mt-0 flex justify-center lg:sticky lg:top-32"
            style={{ ...baseEnter, animationDelay: "400ms" }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                  {selectedStep.id}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {selectedStep.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedStep.description}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <ul className="space-y-3">
                  {selectedStep.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Progress dots (mobile) */}
        <div className="mt-8 flex justify-center gap-2 lg:hidden">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={[
                "h-2 rounded-full transition-all duration-300",
                activeStep === idx
                  ? "w-8 bg-blue-600"
                  : "w-2 bg-slate-300 dark:bg-slate-600",
              ].join(" ")}
              aria-label={`Go to step ${step.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
