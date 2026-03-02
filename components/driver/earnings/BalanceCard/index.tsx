"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Wallet, ArrowUpRight, Sparkles } from "lucide-react";
import { Modal } from "@/components";

export interface BalanceCardProps
  extends React.ComponentPropsWithoutRef<"section"> {
  balance: number;
  onWithdrawSuccess?: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

function useAnimatedCounter(target: number, duration = 1000) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  onWithdrawSuccess,
  className,
  ...sectionProps
}) => {
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const animatedBalance = useAnimatedCounter(balance, 1200);

  const wrapperClasses = [
    "relative overflow-hidden",
    "bg-white/50 dark:bg-slate-900/50",
    "backdrop-blur-lg",
    "border border-slate-200/80 dark:border-slate-800/60",
    "shadow-lg",
    "rounded-2xl",
    "p-6 md:p-8",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      setError("Amount exceeds available balance");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Get auth token from Firebase
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Please sign in to continue");
      }

      const token = await user.getIdToken();

      // Call withdraw API
      const response = await fetch("/api/driver/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process withdrawal");
      }

      // Success
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process withdrawal",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.section
        className={wrapperClasses}
        aria-label="Available balance"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{
          y: -2,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-[#00529B]/10 to-[#0077E6]/10"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/10"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex-1">
            <motion.div
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className="p-1.5 rounded-lg bg-gradient-to-br from-[#00529B]/10 to-[#0077E6]/10"
                whileHover={{ scale: 1.1 }}
              >
                <Wallet className="h-4 w-4 text-[#00529B]" />
              </motion.div>
              <span>Available Balance</span>
            </motion.div>
            <motion.div
              className="text-3xl sm:text-4xl font-bold text-foreground mb-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
            >
              {formatCurrency(animatedBalance)}
            </motion.div>
            <motion.p
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Ready to withdraw to your bank account
            </motion.p>
          </div>
          <motion.button
            onClick={() => setShowWithdrawModal(true)}
            disabled={balance <= 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00529B] to-[#0077E6] hover:from-[#003d73] hover:to-[#0066BB] disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all text-sm whitespace-nowrap"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw
          </motion.button>
        </div>
      </motion.section>

      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setError("");
          setWithdrawAmount("");
        }}
        title="Withdraw Funds"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter the amount you wish to withdraw to your linked bank account.
          </p>

          <div>
            <label
              htmlFor="withdrawAmount"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                ₦
              </span>
              <input
                type="number"
                id="withdrawAmount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0"
                min="5000"
                max={balance}
                step="100"
                className="w-full pl-8 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00529B] text-foreground"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Minimum: ₦5,000 • Available: {formatCurrency(balance)}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowWithdrawModal(false);
                setError("");
                setWithdrawAmount("");
              }}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#00529B] hover:bg-[#003d73] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? "Processing..." : "Confirm Withdrawal"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BalanceCard;
