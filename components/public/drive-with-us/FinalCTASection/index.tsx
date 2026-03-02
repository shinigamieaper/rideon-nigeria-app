import * as React from "react";
import Link from "next/link";
import BlurText from "../../../shared/BlurText";
import RevealOnScroll from "../../../shared/RevealOnScroll";

export interface FinalCTASectionProps
  extends React.ComponentPropsWithoutRef<"section"> {
  /** Controls the section background treatment */
  background?: "solid" | "tinted" | "transparent";
}

/**
 * Server Component: FinalCTASection (Drive With Us)
 * Concluding CTA with creative PhoneMockup usage (outside the hero).
 */
export default function FinalCTASection({
  className,
  background = "tinted",
  ...rest
}: FinalCTASectionProps) {
  const enterBase = {
    ["--tw-enter-opacity" as any]: "0",
    ["--tw-enter-translate-y" as any]: "1rem",
    ["--tw-enter-blur" as any]: "8px",
  } as React.CSSProperties;

  return (
    <section
      className={[
        "py-24 sm:py-32",
        background === "transparent"
          ? "bg-transparent"
          : background === "tinted"
            ? "bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800"
            : "bg-background",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Text + CTA */}
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              <BlurText
                as="span"
                text="Ready to take the next step?"
                animateBy="words"
                direction="top"
                delay={120}
              />
            </h2>
            <BlurText
              as="p"
              className="mt-4 text-lg text-slate-600 dark:text-slate-400"
              text="Join a trusted network of professional drivers. Predictable bookings, premium clients, and a team that puts your safety and professionalism first."
              animateBy="words"
              direction="top"
              delay={24}
            />
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/register/driver?track=fleet"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
                style={{ backgroundColor: "#00529B" }}
              >
                <BlurText
                  as="span"
                  text="Start Your Application"
                  animateBy="words"
                  direction="top"
                  delay={60}
                />
              </Link>
            </div>
          </div>

          {/* Right: Supporting card */}
          <RevealOnScroll
            as="div"
            className="flex justify-center lg:justify-end"
            style={{ ...enterBase, animationDelay: "300ms" }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                What you get
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  <span>Clear onboarding steps and support from our team</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  <span>Professional standards and a trusted marketplace</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  <span>
                    Opportunities built around reliability and service quality
                  </span>
                </li>
              </ul>

              <div className="mt-8 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Typical requirements
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Valid driver’s license and verifiable ID</li>
                  <li>Professional conduct and background checks</li>
                  <li>Smartphone access for updates and communication</li>
                </ul>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
