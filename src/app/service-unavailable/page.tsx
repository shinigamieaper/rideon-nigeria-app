import Link from "next/link";

export default function ServiceUnavailablePage() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-12 sm:py-16 text-foreground">
      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-6 sm:p-8 lg:p-12">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Service unavailable
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          This application is currently not available. Please contact support
          for assistance.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:opacity-95"
          >
            Go to Home
          </Link>
          <Link
            href="/support/contact"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 px-5 text-sm font-semibold text-slate-900 dark:text-white backdrop-blur-lg shadow-lg transition-all hover:shadow-2xl"
          >
            Contact Support
          </Link>
        </div>

        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/login?next=%2Fadmin"
            className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Admin access
          </Link>
        </div>
      </div>
    </main>
  );
}
