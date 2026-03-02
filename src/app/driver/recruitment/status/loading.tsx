export default function Loading() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="h-5 w-28 rounded-full bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        </div>

        <section className="rounded-2xl bg-slate-200/50 dark:bg-slate-800/40 p-6 animate-pulse">
          <div className="h-7 w-56 rounded bg-slate-200/70 dark:bg-slate-700/70" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-200/60 dark:bg-slate-700/60" />
        </section>

        <div className="grid grid-cols-1 gap-5">
          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7 animate-pulse">
            <div className="h-5 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-3 h-4 w-3/4 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            <div className="mt-6 h-11 w-full rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
          </section>

          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7 animate-pulse">
            <div className="h-5 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-5 space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-[auto,1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    {i < 2 ? (
                      <div className="mt-2 h-10 w-px bg-slate-200 dark:bg-slate-700" />
                    ) : null}
                  </div>
                  <div>
                    <div className="h-4 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="mt-2 h-3 w-72 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
