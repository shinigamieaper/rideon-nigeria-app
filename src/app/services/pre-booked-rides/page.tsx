import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Shield, Car, Clock, CheckCircle2 } from "lucide-react";
import { BlurText } from "../../../../components";

export const metadata: Metadata = {
  title: "Premium Rentals | RideOn Nigeria",
  description:
    "Reserve premium vehicles with professional drivers for daily or multi-day journeys. Browse our fleet, schedule your pickup, and enjoy safe, reliable transportation across Nigeria.",
};

export default function PreBookedRidesPage() {
  const features = [
    {
      icon: Car,
      title: "Premium Fleet",
      description:
        "Choose from our curated selection of well-maintained vehicles, from sleek sedans to spacious SUVs.",
    },
    {
      icon: Shield,
      title: "Professional Drivers",
      description:
        "All drivers are vetted, licensed, and trained to provide the highest standard of service.",
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description:
        "Book for a few hours, a full day, or multiple days. We adapt to your schedule.",
    },
    {
      icon: Clock,
      title: "Punctual Service",
      description:
        "Your driver arrives on time, every time. Track their arrival in real-time via our app.",
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Browse Our Fleet",
      description:
        "Explore our vehicles and filter by category, price, or availability.",
    },
    {
      step: 2,
      title: "Schedule Your Reservation",
      description:
        "Select your pickup date, time, and duration (daily or half-day).",
    },
    {
      step: 3,
      title: "Confirm & Pay",
      description:
        "Review your booking details and pay securely. No hidden fees.",
    },
    {
      step: 4,
      title: "Enjoy Your Journey",
      description:
        "Your professional driver arrives with your vehicle at the scheduled time.",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:opacity-10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <BlurText
                as="span"
                text="Premium Rentals"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Reserve a premium vehicle with a professional driver for your daily or multi-day transportation needs. Safe, reliable, and hassle-free."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login?next=/app/catalog"
                className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-br from-[#00529B] to-[#0077E6]"
              >
                <BlurText
                  as="span"
                  text="Browse Vehicles"
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
                  text="Talk to Support"
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
                text="Why Choose RideOn"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Experience the difference with our premium rental service."
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
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4">
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
                text="Booking a premium rental is simple and straightforward."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, idx) => (
              <div
                key={item.step}
                className="relative"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg mb-4">
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
                {idx < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent transform translate-x-1/2 -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-8 sm:p-12 text-center shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <BlurText
                as="span"
                text="Ready to reserve your ride?"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              <BlurText
                as="span"
                text="Browse our fleet and book your next journey in minutes."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
            <Link
              href="/login?next=/app/catalog"
              className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-blue-600 bg-white h-12 px-8 transition-all duration-300 hover:scale-105 active:scale-100 shadow-lg"
            >
              <BlurText
                as="span"
                text="Browse Vehicles Now"
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
