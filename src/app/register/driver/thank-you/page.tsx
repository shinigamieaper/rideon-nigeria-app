"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import BlurText from "../../../../../components/shared/BlurText";
import RevealOnScroll from "../../../../../components/shared/RevealOnScroll";

// Load confetti only on the client
const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

export default function DriverThankYouPage() {
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <main className="relative flex min-h-[70vh] w-full items-center justify-center p-6">
      <Confetti
        width={size.width}
        height={size.height}
        numberOfPieces={280}
        recycle={false}
        gravity={0.25}
        colors={["#00529B", "#34A853", "#0ea5e9", "#22c55e"]}
      />

      <RevealOnScroll as="div" className="relative w-full max-w-2xl rounded-2xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center" style={{ ['--tw-enter-scale' as any]: 0.98, ['--tw-enter-blur' as any]: '12px' }}>
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          <BlurText as="span" text="Application Submitted" animateBy="words" direction="top" delay={120} />
        </h1>
        <BlurText
          as="p"
          className="mt-3 text-slate-600 dark:text-slate-400"
          text="Thank you for applying to join RideOn as a driver. Your application is now under review. We’ll notify you by email once a decision is made or if we need any additional information."
          animateBy="words"
          direction="top"
          delay={24}
        />

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition hover:opacity-90" style={{ backgroundColor: '#00529B' }}>
            <BlurText as="span" text="Return Home" animateBy="words" direction="top" delay={60} />
          </Link>
          <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            <BlurText as="span" text="Go to Login" animateBy="words" direction="top" delay={60} />
          </Link>
        </div>
      </RevealOnScroll>
    </main>
  );
}
