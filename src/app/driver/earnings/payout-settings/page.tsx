"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { BankAccountForm, type BankAccountData } from "@/components";
import { Building2, CheckCircle2, Loader2, Info, Shield } from "lucide-react";

interface BankAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
}

export default function PayoutSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [bankAccount, setBankAccount] = React.useState<BankAccount | null>(
    null,
  );
  const [error, setError] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);

  React.useEffect(() => {
    fetchBankAccount();
  }, []);

  const fetchBankAccount = async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login?next=/driver/earnings/payout-settings");
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/driver/payout-settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bank account");
      }

      const data = await response.json();
      if (data.bankAccount) {
        setBankAccount(data.bankAccount);
      }
    } catch (err) {
      console.error("Error fetching bank account:", err);
      setError("Unable to load bank account details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: BankAccountData) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login?next=/driver/earnings/payout-settings");
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/driver/payout-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save bank account");
      }

      const result = await response.json();
      setBankAccount({
        accountNumber: data.accountNumber,
        accountName: data.accountName || "",
        bankName: data.bankName,
        bankCode: data.bankCode,
      });
      setShowForm(false);
    } catch (err) {
      throw err; // Re-throw to let BankAccountForm handle the error display
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00529B]" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading bank account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!showForm && bankAccount ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Linked Bank Account
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All payouts will be sent to this verified account
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Verified</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="p-3 bg-[#00529B] rounded-lg shadow-md">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                  Account Name
                </p>
                <p className="text-lg font-bold text-foreground">
                  {bankAccount.accountName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                  Bank Name
                </p>
                <p className="font-semibold text-foreground">
                  {bankAccount.bankName}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                  Account Number
                </p>
                <p className="font-mono font-semibold text-foreground tracking-wider">
                  ••••••{bankAccount.accountNumber.slice(-4)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="mt-6 w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-semibold rounded-lg transition-all hover:shadow-md"
          >
            Update Bank Account
          </button>
        </div>
      ) : (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-6 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {bankAccount ? "Update Bank Account" : "Link Your Bank Account"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {bankAccount
                ? "Update your bank account details for receiving payouts"
                : "Connect your Nigerian bank account to receive earnings. We'll verify your account instantly using Paystack."}
            </p>
          </div>

          <BankAccountForm
            onSubmit={handleSubmit}
            initialData={
              bankAccount
                ? {
                    accountNumber: bankAccount.accountNumber,
                    bankCode: bankAccount.bankCode,
                    bankName: bankAccount.bankName,
                  }
                : undefined
            }
          />

          {bankAccount && (
            <button
              onClick={() => setShowForm(false)}
              className="mt-4 w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Information Cards */}
      <div className="mt-6 space-y-4">
        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-base pt-1.5">
              Payout Information
            </h3>
          </div>
          <ul className="space-y-2.5 text-sm text-blue-800 dark:text-blue-200 ml-11">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                •
              </span>
              <span>
                Payouts are typically processed within{" "}
                <strong>1-2 business days</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                •
              </span>
              <span>
                Minimum withdrawal amount is <strong>₦5,000</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                •
              </span>
              <span>
                Includes major banks and microfinance banks (Kuda, OPay,
                Moniepoint, etc.)
              </span>
            </li>
          </ul>
        </div>

        <div className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 text-base mb-2">
                Security & Verification
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                Your account name will be verified instantly using Paystack. The
                bank account must be in your legal name for security and
                compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
