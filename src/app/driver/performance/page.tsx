export default function Page() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <section className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Performance
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Weekly rating, feedback, and performance metrics will appear here.
          </p>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Coming soon.
          </div>
        </section>
      </div>
    </div>
  );
}
