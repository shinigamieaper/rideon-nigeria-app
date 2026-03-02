import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

async function getListing(baseUrl: string, id: string) {
  const res = await fetch(
    `${baseUrl}/api/catalog/listings/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()) as {
    id: string;
    city?: string;
    category?: string;
    make?: string;
    model?: string;
    seats?: number | null;
    images?: string[];
    dayRateNgn?: number | null;
    block4hRateNgn?: number | null;
    description?: string;
    specs?: Record<string, any>;
  } | null;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = (rawId || "").trim();
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const base = `${proto}://${host}`;
  const listing = id ? await getListing(base, id) : null;

  const nf = new Intl.NumberFormat("en-NG");
  const title =
    [listing?.make, listing?.model].filter(Boolean).join(" ") ||
    listing?.category ||
    "Vehicle";
  const images = Array.isArray(listing?.images)
    ? (listing.images as string[])
    : [];
  const baseImages = images;
  const hero = baseImages.length > 0 ? baseImages[0] : undefined;

  const dayHref = `/app/book/step-3?listingId=${encodeURIComponent(id)}&rentalUnit=day${listing?.city ? `&city=${encodeURIComponent(listing.city)}` : ""}`;
  const fourHref = `/app/book/step-3?listingId=${encodeURIComponent(id)}&rentalUnit=4h${listing?.city ? `&city=${encodeURIComponent(listing.city)}` : ""}`;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/app/catalog" className="hover:underline">
            Back to Catalog
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800/60">
              {hero ? (
                <Image src={hero} alt={title} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">
                  No image
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {baseImages.slice(0, 8).map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800/60"
                >
                  <Image
                    src={src}
                    alt={`${title} ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {listing?.category || ""}
              {listing?.seats ? ` • ${listing.seats} seats` : ""}
              {listing?.city ? ` • ${listing.city}` : ""}
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/50 p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] text-slate-600 dark:text-slate-400">
                  Day rate
                </span>
                <span className="text-[16px] font-semibold text-[#00529B]">
                  {typeof listing?.dayRateNgn === "number"
                    ? `₦${nf.format(listing!.dayRateNgn!)}`
                    : "—"}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[13px] text-slate-600 dark:text-slate-400">
                  4-hour block
                </span>
                <span className="text-[16px] font-semibold text-[#00529B]">
                  {typeof listing?.block4hRateNgn === "number"
                    ? `₦${nf.format(listing!.block4hRateNgn!)}`
                    : "—"}
                </span>
              </div>
            </div>
            {listing?.description && (
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {listing.description}
              </p>
            )}
            <div className="mt-6 flex items-center gap-3">
              <a
                href={dayHref}
                className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-[#0077E6] to-[#00529B] shadow-lg hover:opacity-95"
              >
                Book • Day Rental
              </a>
              <a
                href={fourHref}
                className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold text-[#00529B] bg-white border border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800/60 hover:opacity-90"
              >
                Book • 4-hour
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
