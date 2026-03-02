"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth, waitForUser } from "@/lib/firebase";
import { Modal, StickyBanner } from "@/components";

export interface PaymentMethodListProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
  createdAt?: string;
}

const PaymentMethodList: React.FC<PaymentMethodListProps> = ({
  className,
  ...rest
}) => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  // No add-new flow: payments will create reusable authorizations automatically.

  const hasAny = methods.length > 0;
  const defaultMethod = useMemo(
    () => methods.find((m) => m.isDefault),
    [methods],
  );

  // use shared waitForUser() helper

  async function fetchMethods() {
    setLoading(true);
    setError(null);
    try {
      const user = await waitForUser();
      const token = await getIdToken(user, true);
      const res = await fetch("/api/users/me/payment-methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to load payment methods");
      setMethods(data.methods || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load payment methods.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMethods();
  }, []);

  async function setAsDefault(id: string) {
    try {
      const user = await waitForUser();
      const token = await getIdToken(user, true);
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ defaultPaymentMethodId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to set default card");
      await fetchMethods();
    } catch (e: any) {
      setError(e?.message || "Failed to set default card.");
    }
  }

  async function removeMethod(id: string) {
    try {
      const user = await waitForUser();
      const token = await getIdToken(user, true);
      const res = await fetch(`/api/users/me/payment-methods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to remove card");
      setConfirmRemoveId(null);
      await fetchMethods();
    } catch (e: any) {
      setError(e?.message || "Failed to remove card.");
    }
  }

  // We intentionally removed the inline Paystack add-card flow.

  return (
    <div
      className={["mx-auto max-w-3xl px-4 sm:px-6", className || ""].join(" ")}
      {...rest}
    >
      {error && (
        <StickyBanner className="px-4">
          <div className="mx-auto max-w-3xl w-full">
            <div className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          </div>
        </StickyBanner>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {!hasAny && !loading && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg p-6 text-center">
          <h3 className="text-lg font-semibold">No Payment Methods Saved</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Cards are saved automatically the first time you pay via Paystack.
            You’ll see them here afterwards.
          </p>
        </div>
      )}

      {hasAny && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg divide-y divide-slate-200/80 dark:divide-slate-800/60">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-16 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">
                {m.brand || "Card"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">•••• {m.last4}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Exp. {m.expMonth?.toString().padStart(2, "0")}/{m.expYear}
                </p>
              </div>
              {m.isDefault && (
                <span className="mr-2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-xs">
                  Default
                </span>
              )}
              <button
                aria-label="More"
                className="h-8 w-8 rounded-md hover:bg-white/60 dark:hover:bg-slate-800/60"
                onClick={() =>
                  setMenuOpenId((id) => (id === m.id ? null : m.id))
                }
              >
                ⋯
              </button>
              {menuOpenId === m.id && (
                <div className="relative">
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl overflow-hidden">
                    {!m.isDefault && (
                      <button
                        className="block w-full text-left px-3 py-2 hover:bg-slate-50/80 dark:hover:bg-white/10"
                        onClick={() => {
                          setMenuOpenId(null);
                          setAsDefault(m.id);
                        }}
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50/70 dark:hover:bg-red-500/10"
                      onClick={() => {
                        setMenuOpenId(null);
                        setConfirmRemoveId(m.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* No add-new button by design */}
        </div>
      )}

      <Modal
        isOpen={!!confirmRemoveId}
        onClose={() => setConfirmRemoveId(null)}
        title="Remove card?"
      >
        <p className="text-sm">This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow hover:bg-white/70 dark:hover:bg-slate-800/80"
            onClick={() => setConfirmRemoveId(null)}
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white shadow-lg shadow-red-900/30 hover:opacity-90"
            onClick={() => confirmRemoveId && removeMethod(confirmRemoveId)}
          >
            Remove
          </button>
        </div>
      </Modal>

      {/* No add-card modal */}
    </div>
  );
};

export default PaymentMethodList;
