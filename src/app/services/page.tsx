import type { Metadata } from "next";
import Link from "next/link";
import { Car, UserCheck, Briefcase } from "lucide-react";
import { BlurText } from "../../../components";

export const metadata: Metadata = {
  title: "Our Services | RideOn Nigeria",
  description:
    "Explore RideOn's premium mobility solutions: chauffeur-driven rentals, drive-my-car services, and full-time driver placement across Nigeria.",
};

export default function ServicesPage() {
  const services = [
    {
      id: "pre-booked-rides",
      icon: Car,
      title: "Chauffeur-Driven Rentals",
      description:
        "Reserve premium vehicles with professional chauffeurs for daily or multi-day journeys. Browse our fleet, schedule your pickup, and enjoy safe, reliable transportation.",
      href: "/services/pre-booked-rides",
      ctaText: "Learn More",
      ctaHref: "/services/pre-booked-rides",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      id: "drive-my-car",
      icon: UserCheck,
      title: "Drive My Car",
      description:
        "Need someone to drive your own vehicle? Our professional chauffeurs meet you at your location and safely drive your car wherever you need to go.",
      href: "/services/drive-my-car",
      ctaText: "Learn More",
      ctaHref: "/services/drive-my-car",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      id: "hire-a-driver",
      icon: Briefcase,
      title: "Hire a Full-Time Driver",
      description:
        "Access our marketplace of vetted, professional drivers for full-time placement. Interview, message, and hire the perfect driver for your long-term needs.",
      href: "/services/hire-a-driver",
      ctaText: "Learn More",
      ctaHref: "/services/hire-a-driver",
      gradient: "from-purple-500 to-indigo-600",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:opacity-10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <BlurText
                as="span"
                text="Our Services"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Choose the mobility solution that fits your needs. Professional, safe, and reliable transportation across Nigeria."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <div
                key={service.id}
                className="group relative rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-8"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${service.gradient} mb-6`}
                >
                  <service.icon
                    className="w-6 h-6 text-white"
                    strokeWidth={2}
                  />
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  <BlurText
                    as="span"
                    text={service.title}
                    animateBy="words"
                    direction="top"
                    delay={100}
                  />
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  <BlurText
                    as="span"
                    text={service.description}
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href={service.ctaHref}
                    className="inline-flex items-center justify-center rounded-xl text-sm font-semibold text-white h-11 px-6 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-br from-[#00529B] to-[#0077E6]"
                  >
                    <BlurText
                      as="span"
                      text={service.ctaText}
                      animateBy="letters"
                      direction="top"
                      delay={18}
                    />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            <BlurText
              as="span"
              text="Need help choosing?"
              animateBy="words"
              direction="top"
              delay={80}
            />
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            <BlurText
              as="span"
              text="Our support team is ready to help you find the perfect transportation solution for your needs."
              animateBy="words"
              direction="top"
              delay={24}
            />
          </p>
          <Link
            href="/support/contact"
            className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg"
            style={{ backgroundColor: "#00529B" }}
          >
            <BlurText
              as="span"
              text="Contact Support"
              animateBy="letters"
              direction="top"
              delay={18}
            />
          </Link>
        </div>
      </section>
    </main>
  );
}
