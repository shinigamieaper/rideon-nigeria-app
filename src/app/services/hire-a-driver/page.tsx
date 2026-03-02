import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Shield,
  Search,
  CheckCircle2,
} from "lucide-react";
import { BlurText } from "../../../../components";

export const metadata: Metadata = {
  title: "Hire a Full-Time Driver | RideOn Nigeria",
  description:
    "Access our marketplace of vetted, professional drivers for full-time placement. Interview, message, and hire the perfect driver for your long-term transportation needs.",
};

export default function HireADriverPage() {
  const features = [
    {
      icon: Search,
      title: "Browse Qualified Drivers",
      description:
        "Access our marketplace of pre-screened drivers with verified credentials and references.",
    },
    {
      icon: MessageSquare,
      title: "Interview & Message",
      description:
        "Connect directly with candidates, ask questions, and schedule interviews through our platform.",
    },
    {
      icon: Shield,
      title: "Background Verification",
      description:
        "All drivers undergo thorough KYC checks including NIN, BVN, and reference verification.",
    },
    {
      icon: CheckCircle2,
      title: "Transparent Hiring",
      description:
        "Review driving history, experience, and customer ratings before making your decision.",
    },
  ];

  const process = [
    {
      step: 1,
      title: "Browse Drivers",
      description:
        "Explore our marketplace and filter by experience, location, and availability.",
    },
    {
      step: 2,
      title: "Send Interview Requests",
      description:
        "Request interviews with candidates that match your requirements.",
    },
    {
      step: 3,
      title: "Message & Interview",
      description:
        "Chat with candidates and conduct interviews to find the right fit.",
    },
    {
      step: 4,
      title: "Hire Your Driver",
      description:
        "Once you've found the perfect match, finalize the hiring through our platform.",
    },
  ];

  const benefits = [
    "Vetted professionals with verified credentials",
    "Direct communication with candidates",
    "Transparent hiring process",
    "Long-term placement support",
    "Secure messaging platform",
    "Reference verification included",
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:opacity-10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <BlurText
                as="span"
                text="Hire a Full-Time Driver"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Access our marketplace of vetted, professional drivers for full-time placement. Interview candidates, exchange messages, and hire the perfect driver for your long-term needs."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login?next=/app/hire-a-driver"
                className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600"
              >
                <BlurText
                  as="span"
                  text="Browse Drivers"
                  animateBy="letters"
                  direction="top"
                  delay={18}
                />
              </Link>
              <Link
                href="/support/contact"
                className="inline-flex items-center justify-center rounded-xl text-base font-medium h-12 px-8 bg-white/10 backdrop-blur-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
              >
                <BlurText
                  as="span"
                  text="Learn More"
                  animateBy="letters"
                  direction="top"
                  delay={18}
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="Why Use Our Driver Marketplace"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Find and hire the perfect full-time driver with confidence."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
                  <feature.icon
                    className="w-6 h-6 text-white"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  <BlurText
                    as="span"
                    text={feature.title}
                    animateBy="words"
                    direction="top"
                    delay={100}
                  />
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  <BlurText
                    as="span"
                    text={feature.description}
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="How It Works"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Finding and hiring a full-time driver is simple with our platform."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {process.map((item, idx) => (
              <div
                key={item.step}
                className="relative"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    <BlurText
                      as="span"
                      text={item.title}
                      animateBy="words"
                      direction="top"
                      delay={100}
                    />
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    <BlurText
                      as="span"
                      text={item.description}
                      animateBy="words"
                      direction="top"
                      delay={24}
                    />
                  </p>
                </div>
                {idx < process.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-transparent transform translate-x-1/2 -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                <BlurText
                  as="span"
                  text="What's Included"
                  animateBy="words"
                  direction="top"
                  delay={80}
                />
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                <BlurText
                  as="span"
                  text="Every driver in our marketplace comes with comprehensive verification and support."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300">
                      <BlurText
                        as="span"
                        text={benefit}
                        animateBy="words"
                        direction="top"
                        delay={24}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-8">
              <h3 className="text-2xl font-semibold mb-4">
                <BlurText
                  as="span"
                  text="Perfect for"
                  animateBy="words"
                  direction="top"
                  delay={100}
                />
              </h3>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <BlurText
                    as="span"
                    text="Families needing a dedicated driver"
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <BlurText
                    as="span"
                    text="Businesses hiring company drivers"
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <BlurText
                    as="span"
                    text="Executives requiring personal chauffeurs"
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <BlurText
                    as="span"
                    text="Anyone seeking long-term driving assistance"
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-8 sm:p-12 text-center shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <BlurText
                as="span"
                text="Ready to hire a driver?"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-purple-100 mb-8">
              <BlurText
                as="span"
                text="Browse our marketplace of qualified drivers and find your perfect match."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
            <Link
              href="/login?next=/app/hire-a-driver"
              className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-purple-600 bg-white h-12 px-8 transition-all duration-300 hover:scale-105 active:scale-100 shadow-lg"
            >
              <BlurText
                as="span"
                text="Browse Drivers Now"
                animateBy="letters"
                direction="top"
                delay={18}
              />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
