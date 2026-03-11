import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, ShieldCheck } from "lucide-react";
import BlurText from "../../../components/shared/BlurText";
import RevealOnScroll from "../../../components/shared/RevealOnScroll";

export const metadata: Metadata = {
  title: "Partner With Us | RideOn Nigeria",
  description:
    "List your vehicles with RideOn and earn reliably through our professional premium rentals marketplace across Nigeria. Join our trusted partner network.",
};

export default function PartnerWithUsPage() {
  return (
    <main className="relative z-10 min-h-screen w-full pt-24 pb-16 px-4 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        <RevealOnScroll
          as="div"
          className="mb-12 text-center"
          style={
            {
              ["--tw-enter-opacity" as any]: "0",
              ["--tw-enter-translate-y" as any]: "1rem",
              ["--tw-enter-blur" as any]: "10px",
            } as React.CSSProperties
          }
        >
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            <BlurText
              as="span"
              text="Partner With RideOn"
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto"
            text="List your vehicles, earn reliably, and grow with a professional premium rentals marketplace across Nigeria."
            animateBy="words"
            direction="top"
            delay={24}
          />

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register/partner"
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition hover:opacity-90"
              style={{ backgroundColor: "#00529B" }}
            >
              <BlurText
                as="span"
                text="Become a Partner"
                animateBy="words"
                direction="top"
                delay={60}
              />
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/support/contact"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <BlurText
                as="span"
                text="Talk to Us"
                animateBy="words"
                direction="top"
                delay={60}
              />
            </Link>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RevealOnScroll
            as="section"
            className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6"
            style={
              {
                ["--tw-enter-scale" as any]: 0.98,
                ["--tw-enter-blur" as any]: "14px",
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">
                Built for Individuals & Fleets
              </h2>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Whether you are an individual owner or a registered fleet company,
              RideOn supports structured onboarding and scalable vehicle
              management.
            </p>
          </RevealOnScroll>

          <RevealOnScroll
            as="section"
            className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6"
            style={
              {
                ["--tw-enter-scale" as any]: 0.98,
                ["--tw-enter-blur" as any]: "14px",
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">Verified & Trusted</h2>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              We verify partners using CAC and other business checks.
              Individuals also require identity verification and business
              documentation.
            </p>
          </RevealOnScroll>

          <RevealOnScroll
            as="section"
            className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6"
            style={
              {
                ["--tw-enter-scale" as any]: 0.98,
                ["--tw-enter-blur" as any]: "14px",
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <FileCheck2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold">
                Vehicle Review & Approval
              </h2>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              After partner approval, you can submit vehicles in the Partner
              Portal. Each vehicle is reviewed with documents like license, road
              worthiness, and insurance.
            </p>
          </RevealOnScroll>
        </div>

        <RevealOnScroll
          as="section"
          className="mt-10 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8 lg:p-12"
          style={
            {
              ["--tw-enter-scale" as any]: 0.98,
              ["--tw-enter-blur" as any]: "14px",
            } as React.CSSProperties
          }
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            <BlurText
              as="span"
              text="Requirements"
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-5">
              <p className="font-semibold">Partner verification (must pass)</p>
              <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-400">
                <li>CAC verification</li>
                <li>Business details & payout account</li>
                <li>Individuals: BVN/NIN + business/CAC documentation</li>
                <li>Businesses: director verification</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-5">
              <p className="font-semibold">
                Vehicle documentation (per vehicle)
              </p>
              <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-400">
                <li>Vehicle license</li>
                <li>Road worthiness</li>
                <li>Insurance</li>
                <li>Any required city/state permits</li>
              </ul>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </main>
  );
}
