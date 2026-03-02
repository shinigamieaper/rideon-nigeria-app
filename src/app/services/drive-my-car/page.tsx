import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Shield, Clock, CheckCircle2 } from "lucide-react";
import { BlurText } from "../../../../components";

export const metadata: Metadata = {
  title: "Drive My Car Service | RideOn Nigeria",
  description:
    "Professional chauffeurs to drive your own vehicle. Our drivers meet you at your location and safely transport you in your car wherever you need to go.",
};

export default function DriveMyCarPage() {
  const benefits = [
    {
      icon: Shield,
      title: "Vetted Professionals",
      description:
        "All chauffeurs undergo thorough background checks and have verified driving credentials.",
    },
    {
      icon: MapPin,
      title: "Flexible Pickup",
      description:
        "Our driver meets you at your specified location - your home, office, or anywhere convenient.",
    },
    {
      icon: Clock,
      title: "On-Demand & Scheduled",
      description:
        "Request a driver immediately or schedule in advance for planned trips.",
    },
    {
      icon: CheckCircle2,
      title: "Your Vehicle, Our Care",
      description:
        "Your car is handled with the utmost care and professionalism throughout the journey.",
    },
  ];

  const useCases = [
    {
      title: "After Social Events",
      description:
        "Enjoyed a night out? We'll drive you and your car home safely.",
    },
    {
      title: "Medical Appointments",
      description:
        "Need to take medication that prevents driving? We've got you covered.",
    },
    {
      title: "Long Journeys",
      description:
        "Tired of driving long distances? Let a professional take the wheel.",
    },
    {
      title: "Vehicle Testing",
      description:
        "Just purchased a car? Have our driver assess and deliver it for you.",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-green-950/20 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:opacity-10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <BlurText
                as="span"
                text="Drive My Car Service"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Need someone to drive your own vehicle? Our professional chauffeurs meet you at your location and safely drive your car wherever you need to go."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login?next=/app/drive-my-car/request"
                className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600"
              >
                <BlurText
                  as="span"
                  text="Request a Driver"
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

      {/* How It Works Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="How Drive My Car Works"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Getting a professional driver for your vehicle is simple."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: 1,
                title: "Submit Request",
                description:
                  "Enter your pickup location, destination, and preferred time.",
              },
              {
                step: 2,
                title: "Driver Assigned",
                description:
                  "We match you with a professional chauffeur and confirm details.",
              },
              {
                step: 3,
                title: "Meet Your Driver",
                description:
                  "The chauffeur arrives at your location at the scheduled time.",
              },
              {
                step: 4,
                title: "Enjoy Your Journey",
                description:
                  "Sit back and relax while we drive you safely to your destination.",
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className="relative"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold text-lg mb-4">
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
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 w-full h-0.5 bg-gradient-to-r from-green-500/50 to-transparent transform translate-x-1/2 -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="Why Choose Drive My Car"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, idx) => (
              <div
                key={benefit.title}
                className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
                  <benefit.icon
                    className="w-6 h-6 text-white"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  <BlurText
                    as="span"
                    text={benefit.title}
                    animateBy="words"
                    direction="top"
                    delay={100}
                  />
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  <BlurText
                    as="span"
                    text={benefit.description}
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

      {/* Use Cases Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="Common Use Cases"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Our Drive My Car service is perfect for various situations."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, idx) => (
              <div
                key={useCase.title}
                className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <h3 className="text-lg font-semibold mb-2">
                  <BlurText
                    as="span"
                    text={useCase.title}
                    animateBy="words"
                    direction="top"
                    delay={100}
                  />
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  <BlurText
                    as="span"
                    text={useCase.description}
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

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-8 sm:p-12 text-center shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <BlurText
                as="span"
                text="Need a driver for your car?"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-green-100 mb-8">
              <BlurText
                as="span"
                text="Request a professional chauffeur in just a few taps."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
            <Link
              href="/login?next=/app/drive-my-car/request"
              className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-green-600 bg-white h-12 px-8 transition-all duration-300 hover:scale-105 active:scale-100 shadow-lg"
            >
              <BlurText
                as="span"
                text="Request Now"
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
