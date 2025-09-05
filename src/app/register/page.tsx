"use client";

import Link from "next/link";
import { ArrowRight, Car, User } from "lucide-react";
import BlurText from "../../../components/shared/BlurText";

export default function RegisterPage() {
  return (
    <main className="relative z-10 flex min-h-screen w-full items-center justify-center p-4  text-foreground">
      {/* Background handled globally by DottedBackground */}

      <div className="relative w-full max-w-4xl text-center">
        <div className="mb-12 animate-in">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            <BlurText as="span" text="Join RideOn" animateBy="words" direction="top" delay={120} />
          </h1>
          <BlurText
            as="p"
            className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto"
            text="Choose your path to get started. Are you looking for a ride, or do you want to drive?"
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* I Need a Ride */}
          <Link
            href="/register/customer"
            className="group relative block p-8 rounded-2xl border border-white/10 bg-white/70 backdrop-blur-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-blue-500/80 dark:bg-slate-900/80"
          >
            <div className="flex flex-col items-start text-left">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <User className="w-7 h-7 text-blue-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold mt-6">
                <BlurText as="span" text="I Need a Ride" animateBy="words" direction="top" delay={100} />
              </h2>
              <BlurText
                as="p"
                className="text-gray-600 dark:text-slate-400 mt-2 text-base"
                text="Sign up as a customer to book fast, reliable, and affordable rides across Nigeria."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-6 text-sm font-medium text-blue-400 flex items-center gap-2">
                <BlurText as="span" text="Register as a customer" animateBy="words" direction="top" delay={60} />
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </div>
            </div>
          </Link>

          {/* I Want to Drive */}
          <Link
            href="/register/driver"
            className="group relative block p-8 rounded-2xl border border-white/10 bg-white/70 backdrop-blur-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-green-500/80 dark:bg-slate-900/80"
          >
            <div className="flex flex-col items-start text-left">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Car className="w-7 h-7 text-green-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold mt-6">
                <BlurText as="span" text="I Want to Drive" animateBy="words" direction="top" delay={100} />
              </h2>
              <BlurText
                as="p"
                className="text-gray-600 dark:text-slate-400 mt-2 text-base"
                text="Join our network of drivers, set your own schedule, and start earning on your own terms."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-6 text-sm font-medium text-green-400 flex items-center gap-2">
                <BlurText as="span" text="Register as a driver" animateBy="words" direction="top" delay={60} />
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center animate-in">
          <p className="text-gray-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
