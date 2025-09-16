"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { auth } from "@/lib/firebase";

export interface PaymentMethod {
  id: string;
  brand: string; // e.g., Visa
  last4: string;
  authorizationCode?: string; // Paystack authorization_code
  isDefault?: boolean;
}

export interface PaymentMethodSelectorProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod | null) => void;
}

export default function PaymentMethodSelector({ value, onChange, className, ...props }: PaymentMethodSelectorProps) {
  const [methods, setMethods] = React.useState<PaymentMethod[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchMethods = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/users/me/payment-methods', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to load payment methods');
      const data = await res.json();
      const list: PaymentMethod[] = data.methods ?? [];
      setMethods(list);
      const def = list.find((m) => m.isDefault) ?? list[0] ?? null;
      if (!value && def) onChange(def);
    } catch (e: any) {
      setError('Unable to fetch saved payment methods.');
    } finally {
      setLoading(false);
    }
  }, [onChange, value]);

  React.useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleAddNew = async () => {
    // Lightweight integration: if Paystack public key present, open inline script; otherwise show guidance
    const pk = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!pk) {
      alert('Paystack public key missing. Please set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to add a card.');
      return;
    }
    // Load inline script if needed
    if (!(window as any).PaystackPop) {
      await new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://js.paystack.co/v1/inline.js';
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
    }
    // Note: This is a placeholder tokenization flow. In real usage, initialize on server and collect authorization_code.
    const email = (window as any).rideonUserEmail || 'test@example.com';
    const handler = (window as any).PaystackPop.setup({
      key: pk,
      email,
      amount: 100, // minimal amount for tokenization test (₦1)
      callback: async (response: any) => {
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await fetch('/api/users/me/payment-methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              brand: 'Card',
              last4: '****',
              authorizationCode: response.reference || 'ref_'+Math.random().toString(36).slice(2),
              makeDefault: true,
            }),
          });
          if (res.ok) {
            await fetchMethods();
            setOpen(false);
          } else {
            alert('Failed to save card.');
          }
        } catch (err) {
          console.error(err);
        }
      },
      onClose: () => {},
    });
    handler.openIframe();
  };

  return (
    <div className={className} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-slate-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pay with</p>
        </div>
        <button type="button" className="text-sm text-[#00529B] hover:underline" onClick={() => setOpen(true)}>
          {value ? 'Change' : 'Add Payment Method'}
        </button>
      </div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
        {loading ? 'Loading…' : value ? `${value.brand} **** ${value.last4}` : 'No saved method'}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Select Payment Method">
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="space-y-2">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={[
                'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left',
                'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              <span>{m.brand} **** {m.last4}</span>
              {m.isDefault && <span className="text-xs text-slate-500">Default</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={handleAddNew}>Add New Card</Button>
        </div>
      </Modal>
    </div>
  );
}
