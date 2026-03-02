"use client";

import * as React from "react";
import { StickyBanner } from "@/components";
import { waitForUser } from "@/lib/firebase";

// Stable Lagos proximity to bias geocoding; module-level to avoid identity changes across renders
const LAGOS_PROXIMITY: [number, number] = [3.3792, 6.5244];

export interface Place {
  id?: string;
  label: string;
  coords?: [number, number];
}

export interface SavedPlacesManagerProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export default function SavedPlacesManager({
  className,
  ...rest
}: SavedPlacesManagerProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [home, setHome] = React.useState<Place | null>(null);
  const [work, setWork] = React.useState<Place | null>(null);
  const [favorites, setFavorites] = React.useState<Place[]>([]);

  // Inputs for Home/Work with suggestions
  const [homeInput, setHomeInput] = React.useState<string>("");
  const [workInput, setWorkInput] = React.useState<string>("");
  const [homeQuery, setHomeQuery] = React.useState<string>("");
  const [workQuery, setWorkQuery] = React.useState<string>("");
  const [homeResults, setHomeResults] = React.useState<
    Array<{ id?: string; label: string; coords?: [number, number] }>
  >([]);
  const [workResults, setWorkResults] = React.useState<
    Array<{ id?: string; label: string; coords?: [number, number] }>
  >([]);
  const [loadingHome, setLoadingHome] = React.useState(false);
  const [loadingWork, setLoadingWork] = React.useState(false);
  const [errorHome, setErrorHome] = React.useState<string | null>(null);
  const [errorWork, setErrorWork] = React.useState<string | null>(null);

  // Add-a-place flow
  const [newName, setNewName] = React.useState<string>("");
  const [newLocInput, setNewLocInput] = React.useState<string>("");
  const [newLocQuery, setNewLocQuery] = React.useState<string>("");
  const [newLocResults, setNewLocResults] = React.useState<
    Array<{ id?: string; label: string; coords?: [number, number] }>
  >([]);
  const [loadingNewLoc, setLoadingNewLoc] = React.useState(false);
  const [errorNewLoc, setErrorNewLoc] = React.useState<string | null>(null);
  // Google Places session tokens (match booking flow behavior)
  const newToken = React.useCallback(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    [],
  );
  const [homeToken, setHomeToken] = React.useState<string | null>(null);
  const [workToken, setWorkToken] = React.useState<string | null>(null);
  const [newLocToken, setNewLocToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const user = await waitForUser();
        const token = await user.getIdToken();
        const res = await fetch("/api/users/me/places", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to load saved places");
        if (!cancelled) {
          setHome(j?.home || null);
          setWork(j?.work || null);
          setFavorites(Array.isArray(j?.favorites) ? j.favorites : []);
          setHomeInput((j?.home?.label as string) || "");
          setWorkInput((j?.work?.label as string) || "");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load saved places.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(partial: {
    home?: Place | null;
    work?: Place | null;
    favorites?: Place[];
  }) {
    try {
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/users/me/places", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(partial),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to update saved places");
    } catch (e: any) {
      setError(e?.message || "Failed to update saved places.");
      setTimeout(() => setError(null), 2500);
    }
  }

  // Suggestion helpers (MapTiler by default)
  const geocodeEndpoint = "/api/maps/geocode";
  const provider: "maptiler" | "google" =
    (process.env.NEXT_PUBLIC_GEOCODER_PROVIDER as any) ?? "maptiler";
  const publicMaptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY as
    | string
    | undefined;
  const suggestionDelayMs = 180;

  const homeRequestIdRef = React.useRef(0);
  const workRequestIdRef = React.useRef(0);
  const newLocRequestIdRef = React.useRef(0);

  const maptilerFallback = React.useCallback(async (q: string) => {
    return [];
  }, []);

  // Debounce suggestion fetchers
  React.useEffect(() => {
    const q = homeQuery.trim();
    if (!q) {
      // Avoid infinite loops: only update if something actually needs clearing
      if (homeResults.length || errorHome || loadingHome) {
        if (homeResults.length) setHomeResults([]);
        if (errorHome) setErrorHome(null);
        if (loadingHome) setLoadingHome(false);
      }
      return;
    }
    const requestId = ++homeRequestIdRef.current;
    // Show searching state immediately (match booking inputs)
    setLoadingHome(true);
    setErrorHome(null);
    if (provider === "google" && !homeToken) setHomeToken(newToken());
    const timer = setTimeout(async () => {
      try {
        const ll = `${LAGOS_PROXIMITY[0]},${LAGOS_PROXIMITY[1]}`;
        const st =
          provider === "google" && homeToken
            ? `&sessiontoken=${encodeURIComponent(homeToken)}`
            : "";
        const resp = await fetch(
          `${geocodeEndpoint}?q=${encodeURIComponent(q)}&provider=${provider}&ll=${encodeURIComponent(ll)}${st}`,
          { cache: "no-store" },
        );
        const data = await resp.json();
        if (!resp.ok)
          throw new Error(data?.error || "Failed to fetch suggestions");
        let items = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) {
          const fallback = await maptilerFallback(q);
          if (fallback.length) items = fallback;
        }
        if (homeRequestIdRef.current === requestId) setHomeResults(items);
      } catch {
        if (homeRequestIdRef.current === requestId) {
          setErrorHome("Could not load suggestions");
          setHomeResults([]);
        }
      } finally {
        if (homeRequestIdRef.current === requestId) setLoadingHome(false);
      }
    }, suggestionDelayMs);
    return () => clearTimeout(timer);
  }, [
    homeQuery,
    geocodeEndpoint,
    maptilerFallback,
    provider,
    suggestionDelayMs,
    homeToken,
    newToken,
  ]);

  React.useEffect(() => {
    const q = workQuery.trim();
    if (!q) {
      if (workResults.length || errorWork || loadingWork) {
        if (workResults.length) setWorkResults([]);
        if (errorWork) setErrorWork(null);
        if (loadingWork) setLoadingWork(false);
      }
      return;
    }
    const requestId = ++workRequestIdRef.current;
    setLoadingWork(true);
    setErrorWork(null);
    if (provider === "google" && !workToken) setWorkToken(newToken());
    const timer = setTimeout(async () => {
      try {
        const ll = `${LAGOS_PROXIMITY[0]},${LAGOS_PROXIMITY[1]}`;
        const st =
          provider === "google" && workToken
            ? `&sessiontoken=${encodeURIComponent(workToken)}`
            : "";
        const resp = await fetch(
          `${geocodeEndpoint}?q=${encodeURIComponent(q)}&provider=${provider}&ll=${encodeURIComponent(ll)}${st}`,
          { cache: "no-store" },
        );
        const data = await resp.json();
        if (!resp.ok)
          throw new Error(data?.error || "Failed to fetch suggestions");
        let items = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) {
          const fallback = await maptilerFallback(q);
          if (fallback.length) items = fallback;
        }
        if (workRequestIdRef.current === requestId) setWorkResults(items);
      } catch {
        if (workRequestIdRef.current === requestId) {
          setErrorWork("Could not load suggestions");
          setWorkResults([]);
        }
      } finally {
        if (workRequestIdRef.current === requestId) setLoadingWork(false);
      }
    }, suggestionDelayMs);
    return () => clearTimeout(timer);
  }, [
    workQuery,
    geocodeEndpoint,
    maptilerFallback,
    provider,
    suggestionDelayMs,
    workToken,
    newToken,
  ]);

  React.useEffect(() => {
    const q = newLocQuery.trim();
    if (!q) {
      if (newLocResults.length || errorNewLoc || loadingNewLoc) {
        if (newLocResults.length) setNewLocResults([]);
        if (errorNewLoc) setErrorNewLoc(null);
        if (loadingNewLoc) setLoadingNewLoc(false);
      }
      return;
    }
    const requestId = ++newLocRequestIdRef.current;
    setLoadingNewLoc(true);
    setErrorNewLoc(null);
    if (provider === "google" && !newLocToken) setNewLocToken(newToken());
    const timer = setTimeout(async () => {
      try {
        const ll = `${LAGOS_PROXIMITY[0]},${LAGOS_PROXIMITY[1]}`;
        const st =
          provider === "google" && newLocToken
            ? `&sessiontoken=${encodeURIComponent(newLocToken)}`
            : "";
        const resp = await fetch(
          `${geocodeEndpoint}?q=${encodeURIComponent(q)}&provider=${provider}&ll=${encodeURIComponent(ll)}${st}`,
          { cache: "no-store" },
        );
        const data = await resp.json();
        if (!resp.ok)
          throw new Error(data?.error || "Failed to fetch suggestions");
        let items = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) {
          const fallback = await maptilerFallback(q);
          if (fallback.length) items = fallback;
        }
        if (newLocRequestIdRef.current === requestId) setNewLocResults(items);
      } catch {
        if (newLocRequestIdRef.current === requestId) {
          setErrorNewLoc("Could not load suggestions");
          setNewLocResults([]);
        }
      } finally {
        if (newLocRequestIdRef.current === requestId) setLoadingNewLoc(false);
      }
    }, suggestionDelayMs);
    return () => clearTimeout(timer);
  }, [
    newLocQuery,
    geocodeEndpoint,
    maptilerFallback,
    provider,
    suggestionDelayMs,
    newLocToken,
    newToken,
  ]);

  function selectHome(item: {
    id?: string;
    label: string;
    coords?: [number, number];
  }) {
    const p: Place = {
      label: item.label,
      ...(item.id ? { id: item.id } : {}),
      ...(item.coords ? { coords: item.coords } : {}),
    };
    setHome(p);
    setHomeInput(item.label);
    setHomeResults([]);
    save({ home: p });
  }
  function clearHome() {
    setHome(null);
    setHomeInput("");
    setHomeResults([]);
    save({ home: null });
  }
  function selectWork(item: {
    id?: string;
    label: string;
    coords?: [number, number];
  }) {
    const p: Place = {
      label: item.label,
      ...(item.id ? { id: item.id } : {}),
      ...(item.coords ? { coords: item.coords } : {}),
    };
    setWork(p);
    setWorkInput(item.label);
    setWorkResults([]);
    save({ work: p });
  }
  function clearWork() {
    setWork(null);
    setWorkInput("");
    setWorkResults([]);
    save({ work: null });
  }

  function addPlaceFromSelection(sel: {
    id?: string;
    label: string;
    coords?: [number, number];
  }) {
    const name = newName.trim() || sel.label;
    const place: Place = {
      label: name,
      ...(sel.id ? { id: sel.id } : {}),
      ...(sel.coords ? { coords: sel.coords } : {}),
    };
    const next = [...favorites, place].slice(0, 50);
    setFavorites(next);
    setNewName("");
    setNewLocInput("");
    setNewLocQuery("");
    setNewLocResults([]);
    save({ favorites: next });
  }
  function removeFavorite(idx: number) {
    const next = favorites.filter((_, i) => i !== idx);
    setFavorites(next);
    save({ favorites: next });
  }

  return (
    <div
      className={["mx-auto max-w-3xl px-4 sm:px-6", className || ""].join(" ")}
      {...rest}
    >
      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}
      {loading && (
        <>
          {[0, 1].map((i) => (
            <div
              key={`home-work-skel-${i}`}
              className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 mb-5 animate-pulse"
            >
              <div className="h-4 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="mt-2">
                <div className="h-10 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="mt-2 space-y-2">
                  <div className="h-4 w-64 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                  <div className="h-4 w-56 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 mb-5 animate-pulse">
            <div className="h-4 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="h-10 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-10 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((j) => (
                <span
                  key={`chip-${j}`}
                  className="inline-block h-7 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800/70"
                />
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && (
        <>
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Home
            </h2>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 h-10 rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-transparent px-3 text-sm"
                  placeholder="Search exact address"
                  value={homeInput}
                  onChange={(e) => {
                    setHomeInput(e.target.value);
                    setHomeQuery(e.target.value);
                  }}
                />
                {home && (
                  <button
                    type="button"
                    className="h-10 px-3 rounded-md border text-sm"
                    onClick={clearHome}
                  >
                    Clear
                  </button>
                )}
              </div>
              {(homeResults.length > 0 || loadingHome || errorHome) && (
                <div className="mt-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/60 shadow overflow-hidden">
                  <div className="max-h-40 overflow-auto">
                    {loadingHome && (
                      <div className="px-3 py-2 text-[13px] text-slate-500">
                        Searching…
                      </div>
                    )}
                    {errorHome && !loadingHome && (
                      <div className="px-3 py-2 text-[13px] text-slate-500">
                        {errorHome}
                      </div>
                    )}
                    {!loadingHome &&
                      !errorHome &&
                      homeResults.map((it) => (
                        <button
                          key={it.id ?? it.label}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[14px] hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => selectHome(it)}
                        >
                          {it.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Work
            </h2>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 h-10 rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-transparent px-3 text-sm"
                  placeholder="Search exact address"
                  value={workInput}
                  onChange={(e) => {
                    setWorkInput(e.target.value);
                    setWorkQuery(e.target.value);
                  }}
                />
                {work && (
                  <button
                    type="button"
                    className="h-10 px-3 rounded-md border text-sm"
                    onClick={clearWork}
                  >
                    Clear
                  </button>
                )}
              </div>
              {(workResults.length > 0 || loadingWork || errorWork) && (
                <div className="mt-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/60 shadow overflow-hidden">
                  <div className="max-h-40 overflow-auto">
                    {loadingWork && (
                      <div className="px-3 py-2 text-[13px] text-slate-500">
                        Searching…
                      </div>
                    )}
                    {errorWork && !loadingWork && (
                      <div className="px-3 py-2 text-[13px] text-slate-500">
                        {errorWork}
                      </div>
                    )}
                    {!loadingWork &&
                      !errorWork &&
                      workResults.map((it) => (
                        <button
                          key={it.id ?? it.label}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[14px] hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => selectWork(it)}
                        >
                          {it.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Add a Place
            </h2>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                className="h-10 rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-transparent px-3 text-sm"
                placeholder="Place name (e.g., Gym)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div>
                <input
                  type="text"
                  className="w-full h-10 rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-transparent px-3 text-sm"
                  placeholder="Search location"
                  value={newLocInput}
                  onChange={(e) => {
                    setNewLocInput(e.target.value);
                    setNewLocQuery(e.target.value);
                  }}
                />
                {(newLocResults.length > 0 || loadingNewLoc || errorNewLoc) && (
                  <div className="mt-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/60 shadow overflow-hidden">
                    <div className="max-h-40 overflow-auto">
                      {loadingNewLoc && (
                        <div className="px-3 py-2 text-[13px] text-slate-500">
                          Searching…
                        </div>
                      )}
                      {errorNewLoc && !loadingNewLoc && (
                        <div className="px-3 py-2 text-[13px] text-slate-500">
                          {errorNewLoc}
                        </div>
                      )}
                      {!loadingNewLoc &&
                        !errorNewLoc &&
                        newLocResults.map((it) => (
                          <button
                            key={it.id ?? it.label}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-[14px] hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => addPlaceFromSelection(it)}
                          >
                            {it.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {favorites.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {favorites.map((f, i) => (
                  <span
                    key={`${f.id || f.label}-${i}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 text-[12px] text-slate-700 dark:text-slate-200"
                  >
                    {f.label}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => removeFavorite(i)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
