"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { CatalogGridCard } from "@/components";

type Listing = {
  id: string;
  image?: string | null;
  category?: string;
  make?: string;
  model?: string;
  seats?: number | null;
  city?: string;
  dayRateNgn?: number | null;
  insured?: boolean;
};

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg"
        >
          <div className="h-40 w-full rounded-t-2xl bg-white/60 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
          <div className="p-4">
            <div className="h-5 w-2/3 bg-white/60 dark:bg-slate-800/60 rounded-md animate-pulse" />
            <div className="mt-2 h-4 w-1/2 bg-white/60 dark:bg-slate-800/60 rounded-md animate-pulse" />
            <div className="mt-4 h-8 w-full bg-white/60 dark:bg-slate-800/60 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [listings, setListings] = React.useState<Listing[]>([]);

  const fetchListings = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/listings", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data?.listings)
        ? (data.listings as Listing[])
        : [];
      setListings(arr);
    } catch (e: unknown) {
      console.error("Catalog fetch failed", e);
      setError("We couldn't load the catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const featured = React.useMemo(() => {
    if (!listings || listings.length === 0) return [] as Listing[];
    const withRate = listings.filter((l) => typeof l.dayRateNgn === "number");
    const base = withRate.length > 0 ? withRate : listings;
    return [...base]
      .sort((a, b) => (a.dayRateNgn ?? Infinity) - (b.dayRateNgn ?? Infinity))
      .slice(0, 6);
  }, [listings]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <motion.div
          data-tour="catalog-header"
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.h1
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Browse Our Chauffeur Fleet
          </motion.h1>
          <motion.p
            className="mt-2 text-sm text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Use the filters to find the perfect vehicle. Rent per day or a
            4-hour block with a professional driver.
          </motion.p>
        </motion.div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : error ? (
          <div className="rounded-2xl p-6 border border-red-200/80 dark:border-red-800/60 bg-red-50/60 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchListings}
              className="mt-3 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#00529B] hover:opacity-95"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <motion.section
                data-tour="catalog-featured"
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <motion.div
                  className="flex items-center gap-2 mb-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-[#00529B]" />
                  </motion.div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Featured Vehicles
                  </h2>
                </motion.div>
                <motion.div
                  className="flex gap-4 overflow-x-auto snap-x pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {featured.map((v, idx) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + idx * 0.05 }}
                      className="min-w-[16rem] sm:min-w-[18rem] snap-start"
                    >
                      <CatalogGridCard
                        id={v.id}
                        image={v.image ?? undefined}
                        category={v.category}
                        make={v.make}
                        model={v.model}
                        seats={v.seats ?? undefined}
                        city={v.city}
                        dayRateNgn={v.dayRateNgn ?? undefined}
                        insured={Boolean(v.insured)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )}

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <motion.div
                data-tour="catalog-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.3,
                    },
                  },
                }}
                initial="hidden"
                animate="show"
              >
                {listings.map((v, idx) => (
                  <motion.div
                    key={v.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    <CatalogGridCard
                      id={v.id}
                      image={v.image ?? undefined}
                      category={v.category}
                      make={v.make}
                      model={v.model}
                      seats={v.seats ?? undefined}
                      city={v.city}
                      dayRateNgn={v.dayRateNgn ?? undefined}
                      insured={Boolean(v.insured)}
                    />
                  </motion.div>
                ))}
                {listings.length === 0 && (
                  <motion.div
                    className="col-span-full rounded-2xl text-center bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-8"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No vehicles available yet. Please check back soon.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}
