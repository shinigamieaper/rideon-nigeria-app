"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function DevLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("dev-driver@example.com");
  const [password, setPassword] = React.useState("DevDriver#12345");
  const [track, setTrack] = React.useState<"fleet" | "placement_only">("fleet");
  const [approved, setApproved] = React.useState(true);

  const [customerEmail, setCustomerEmail] = React.useState(
    "dev-customer@example.com",
  );
  const [customerPassword, setCustomerPassword] =
    React.useState("DevCustomer#12345");
  const [customerGrantAccess, setCustomerGrantAccess] = React.useState(true);
  const [customerDurationDays, setCustomerDurationDays] = React.useState("7");

  const [pairGrantAccess, setPairGrantAccess] = React.useState(true);
  const [pairAcceptImmediately, setPairAcceptImmediately] =
    React.useState(false);
  const [pairDurationDays, setPairDurationDays] = React.useState("7");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function setSessionCookie() {
    const u = auth.currentUser;
    if (!u) throw new Error("Auth failed");
    const token = await u.getIdToken();
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token, remember: true }),
    });
  }

  async function seedAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Seed server-side user + docs
      const seedRes = await fetch("/api/dev/seed-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: "Dev",
          lastName: "Driver",
          track,
          approved,
        }),
      });
      const seedJson = await seedRes.json().catch(() => ({}));
      if (!seedRes.ok) throw new Error(seedJson?.error || "Seed failed");

      // Sign in client-side
      await signInWithEmailAndPassword(auth, email, password);

      // Set the server session cookie immediately to avoid race conditions
      await setSessionCookie();

      router.push("/driver");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  async function seedCustomerAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const durationDays = Math.max(
        1,
        Math.min(365, Math.round(Number(customerDurationDays || "7") || 7)),
      );
      const seedRes = await fetch("/api/dev/seed-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          password: customerPassword,
          firstName: "Dev",
          lastName: "Customer",
          enablePlacementPricing: true,
          grantPlacementAccess: customerGrantAccess,
          durationDays,
        }),
      });
      const seedJson = await seedRes.json().catch(() => ({}));
      if (!seedRes.ok) throw new Error(seedJson?.error || "Seed failed");

      await signInWithEmailAndPassword(auth, customerEmail, customerPassword);
      await setSessionCookie();
      router.push("/app/hire-a-driver");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  async function seedPlacementPairAndLoginAs(which: "customer" | "driver") {
    setError(null);
    setLoading(true);
    try {
      const durationDays = Math.max(
        1,
        Math.min(365, Math.round(Number(pairDurationDays || "7") || 7)),
      );
      const seedRes = await fetch("/api/dev/seed-placement-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail,
          customerPassword,
          driverEmail: email,
          driverPassword: password,
          enablePlacementPricing: true,
          grantPlacementAccess: pairGrantAccess,
          durationDays,
          driverApproved: true,
          acceptImmediately: pairAcceptImmediately,
        }),
      });
      const seedJson = await seedRes.json().catch(() => ({}));
      if (!seedRes.ok) throw new Error(seedJson?.error || "Seed failed");

      if (which === "customer") {
        await signInWithEmailAndPassword(auth, customerEmail, customerPassword);
        await setSessionCookie();
        router.push("/app/hire-a-driver/engagements");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        await setSessionCookie();
        router.push("/driver/placement");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || "Failed to seed placement pair");
    } finally {
      setLoading(false);
    }
  }

  async function seedPartnerAndLogin() {
    setError(null);
    setLoading(true);
    try {
      const seedRes = await fetch("/api/dev/seed-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: "Dev",
          lastName: "Partner",
          approved: true,
        }),
      });
      const seedJson = await seedRes.json().catch(() => ({}));
      if (!seedRes.ok) throw new Error(seedJson?.error || "Seed failed");

      await signInWithEmailAndPassword(auth, email, password);

      await setSessionCookie();

      router.push("/partner");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  async function seedAdminAndLogin() {
    setError(null);
    setLoading(true);
    try {
      const seedRes = await fetch("/api/dev/seed-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: "Dev",
          lastName: "Admin",
        }),
      });
      const seedJson = await seedRes.json().catch(() => ({}));
      if (!seedRes.ok) throw new Error(seedJson?.error || "Seed failed");

      await signInWithEmailAndPassword(auth, email, password);

      await setSessionCookie();

      router.push("/admin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <form
          onSubmit={seedAndLogin}
          className="space-y-4 rounded-xl border border-slate-200/60 bg-white/60 p-6 shadow"
        >
          <h1 className="text-lg font-semibold">Dev Driver Login</h1>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full rounded border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="track"
                checked={track === "fleet"}
                onChange={() => setTrack("fleet")}
              />{" "}
              Fleet
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="track"
                checked={track === "placement_only"}
                onChange={() => setTrack("placement_only")}
              />{" "}
              Placement only
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="approved"
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            <label htmlFor="approved">
              Approved (relevant for Fleet track)
            </label>
          </div>
          <button
            disabled={loading}
            className="w-full rounded bg-blue-600 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : "Seed & Log In"}
          </button>
          <button
            type="button"
            onClick={seedAdminAndLogin}
            disabled={loading}
            className="w-full mt-2 rounded bg-emerald-600 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : "Seed Admin & Log In"}
          </button>
          <button
            type="button"
            onClick={seedPartnerAndLogin}
            disabled={loading}
            className="w-full mt-2 rounded bg-slate-900 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : "Seed Partner & Log In"}
          </button>
        </form>

        <form
          onSubmit={seedCustomerAndLogin}
          className="space-y-4 rounded-xl border border-slate-200/60 bg-white/60 p-6 shadow"
        >
          <h2 className="text-lg font-semibold">Dev Customer Login</h2>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full rounded border px-3 py-2"
              type="password"
              value={customerPassword}
              onChange={(e) => setCustomerPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="grantAccess"
              type="checkbox"
              checked={customerGrantAccess}
              onChange={(e) => setCustomerGrantAccess(e.target.checked)}
            />
            <label htmlFor="grantAccess">Grant placement access</label>
          </div>
          <div>
            <label className="block text-sm mb-1">Access duration (days)</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={customerDurationDays}
              onChange={(e) => setCustomerDurationDays(e.target.value)}
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded bg-emerald-600 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : "Seed Customer & Log In"}
          </button>
        </form>

        <div className="space-y-3 rounded-xl border border-slate-200/60 bg-white/60 p-6 shadow">
          <h2 className="text-lg font-semibold">
            Seed Placement Pair (Customer + Driver)
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="pairGrantAccess"
              type="checkbox"
              checked={pairGrantAccess}
              onChange={(e) => setPairGrantAccess(e.target.checked)}
            />
            <label htmlFor="pairGrantAccess">
              Grant placement access to customer
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="pairAccept"
              type="checkbox"
              checked={pairAcceptImmediately}
              onChange={(e) => setPairAcceptImmediately(e.target.checked)}
            />
            <label htmlFor="pairAccept">
              Accept immediately (unlocks chat)
            </label>
          </div>
          <div>
            <label className="block text-sm mb-1">Access duration (days)</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={pairDurationDays}
              onChange={(e) => setPairDurationDays(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => seedPlacementPairAndLoginAs("customer")}
            disabled={loading}
            className="w-full rounded bg-blue-700 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : "Seed Pair & Log In (Customer)"}
          </button>
          <button
            type="button"
            onClick={() => seedPlacementPairAndLoginAs("driver")}
            disabled={loading}
            className="w-full rounded bg-slate-800 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Loading…" : "Seed Pair & Log In (Driver)"}
          </button>
        </div>
      </div>
    </main>
  );
}
