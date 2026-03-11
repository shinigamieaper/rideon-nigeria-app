import { HeroSection, WhyRideOnSection, BlurText } from "../../components";
import Link from "next/link";
import { Car, UserCheck, Briefcase } from "lucide-react";

export default function HomePage() {
  const services = [
    {
      id: "catalog",
      icon: Car,
      title: "Premium Rentals",
      description:
        "Reserve premium vehicles with professional drivers for daily or multi-day journeys.",
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
        "Need someone to drive your own vehicle? Our drivers meet you and drive your car.",
      href: "/services/drive-my-car",
      ctaText: "Learn More",
      ctaHref: "/services/drive-my-car",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      id: "hire-driver",
      icon: Briefcase,
      title: "Hire a Full-Time Driver",
      description:
        "Access our marketplace of vetted drivers for full-time placement and long-term needs.",
      href: "/services/hire-a-driver",
      ctaText: "Learn More",
      ctaHref: "/services/hire-a-driver",
      gradient: "from-purple-500 to-indigo-600",
    },
  ];

  return (
    <>
      <HeroSection>
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-tight">
            <BlurText
              as="span"
              text="Professional Mobility Solutions for Nigeria"
              animateBy="words"
              direction="top"
              delay={80}
            />
          </h1>
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-200/95 max-w-2xl">
            <BlurText
              as="span"
              text="From premium rentals to drive-my-car services and full-time driver placement. Safe, reliable, and professional transportation tailored to your needs."
              animateBy="words"
              direction="top"
              delay={24}
            />
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-xl text-base font-semibold text-white h-12 px-8 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg"
              style={{ backgroundColor: "#00529B" }}
            >
              <BlurText
                as="span"
                text="Explore Services"
                animateBy="letters"
                direction="top"
                delay={18}
              />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-xl text-base font-medium h-12 px-8 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
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
      </HeroSection>

      {/* Choose Your Path Section */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <BlurText
                as="span"
                text="Choose Your Path"
                animateBy="words"
                direction="top"
                delay={80}
              />
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              <BlurText
                as="span"
                text="Select the mobility solution that fits your needs."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <div
                key={service.id}
                className="group relative rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${service.gradient} mb-4`}
                >
                  <service.icon
                    className="w-6 h-6 text-white"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  <BlurText
                    as="span"
                    text={service.title}
                    animateBy="words"
                    direction="top"
                    delay={100}
                  />
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                  <BlurText
                    as="span"
                    text={service.description}
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={service.ctaHref}
                    className="inline-flex items-center justify-center rounded-lg text-sm font-semibold text-white h-10 px-5 transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-100 shadow-md bg-gradient-to-br from-[#00529B] to-[#0077E6]"
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

      <WhyRideOnSection background="transparent" />
    </>
  );
}
