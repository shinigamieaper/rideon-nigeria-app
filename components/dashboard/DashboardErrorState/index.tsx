import * as React from "react";
import { TriangleAlert } from "lucide-react";
import Button from "../../ui/Button";

export interface DashboardErrorStateProps
  extends React.ComponentPropsWithoutRef<"section"> {
  message?: string;
  onRetry?: () => void;
}

export default function DashboardErrorState({
  message = "We couldn't load your dashboard details at the moment. Please check your internet connection and try again.",
  onRetry,
  className,
  ...rest
}: DashboardErrorStateProps) {
  return (
    <section className={className} {...rest}>
      <div className="rounded-2xl p-8 sm:p-10 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Something went wrong.
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-prose mx-auto">
          {message}
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </div>
    </section>
  );
}
