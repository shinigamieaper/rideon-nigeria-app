'use client';

import { Headphones, MapPin, ShieldCheck, Siren, Users, Wrench } from "lucide-react";
import BlurText from "../../../../components/shared/BlurText";

export const dynamic = "force-static";

export default function SafetyPage() {
  const features = [
    {
      icon: <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "Rider & Driver Verification",
      desc:
        "We verify every driver and rider on our platform to ensure a trusted community. Know who you're riding with before you get in.",
    },
    {
      icon: <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "Live GPS Tracking",
      desc:
        "Every trip is tracked with GPS from start to finish. Share your ride status with friends and family for added peace of mind.",
    },
    {
      icon: <Siren className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "In-App Emergency Assistance",
      desc:
        "In case of an emergency, discreetly alert authorities and our safety team directly from the app with a single tap.",
    },
    {
      icon: <Headphones className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "24/7 Support Team",
      desc:
        "Our specially trained support team is available around the clock to help with any safety concerns or incidents.",
    },
    {
      icon: <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "Vehicle Safety Standards",
      desc:
        "All vehicles on our platform pass regular inspections and meet strict safety standards to ensure a safe ride.",
    },
    {
      icon: <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "Community Guidelines",
      desc:
        "We enforce clear community guidelines based on mutual respect to create a positive, safe environment for everyone.",
    },
  ];

  return (
    <div className=" text-foreground">
      {/* Background handled globally by DottedBackground in RootLayout */}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            <BlurText as="span" text="Our Commitment to Safety" animateBy="words" direction="top" delay={120} />
          </h1>
          <p className="mt-4 text-lg text-foreground/70">
            <BlurText as="span" text="Your well-being is our top priority. We're dedicated to keeping you safe on every journey." animateBy="words" direction="top" delay={24} />
          </p>
        </div>

        {/* Features */}
        <div className="mt-16 sm:mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-y-4 p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 dark:bg-blue-500/10">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold">
                  <BlurText as="span" text={f.title} animateBy="words" direction="top" delay={100} />
                </h3>
                <p className="text-foreground/70">
                  <BlurText as="span" text={f.desc} animateBy="words" direction="top" delay={24} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
