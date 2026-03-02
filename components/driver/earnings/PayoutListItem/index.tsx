"use client";

import * as React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock, XCircle, ArrowDownToLine } from "lucide-react";

export interface PayoutListItemProps
  extends React.ComponentPropsWithoutRef<"div"> {
  payout: {
    id: string;
    amount: number;
    date: string;
    bankName: string;
    accountNumber: string; // Last 4 digits
    status: "completed" | "pending" | "failed";
    reference?: string;
  };
  index?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const PayoutListItem: React.FC<PayoutListItemProps> = ({
  payout,
  index = 0,
  className,
}) => {
  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      label: "Completed",
    },
    pending: {
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      label: "Processing",
    },
    failed: {
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      label: "Failed",
    },
  };

  const config = statusConfig[payout.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      className={[
        "relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.1)" }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon and Details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <motion.div
            className={["p-2.5 rounded-xl", config.bgColor].join(" ")}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              delay: index * 0.05 + 0.1,
            }}
          >
            <ArrowDownToLine className={["h-5 w-5", config.color].join(" ")} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <motion.h4
                className="font-semibold text-foreground text-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.1 }}
              >
                Payout to {payout.bankName}
              </motion.h4>
              <motion.div
                className={[
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                  config.bgColor,
                  config.color,
                ].join(" ")}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.15 }}
              >
                <StatusIcon className="h-3 w-3" />
                <span>{config.label}</span>
              </motion.div>
            </div>
            <motion.p
              className="text-xs text-slate-500 dark:text-slate-400 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.2 }}
            >
              Account ending in ••••{payout.accountNumber}
            </motion.p>
            <motion.p
              className="text-xs text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.25 }}
            >
              {formatDate(payout.date)}
            </motion.p>
            {payout.reference && (
              <motion.p
                className="text-xs text-slate-400 dark:text-slate-500 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 + 0.3 }}
              >
                Ref: {payout.reference}
              </motion.p>
            )}
          </div>
        </div>

        {/* Right: Amount */}
        <motion.div
          className="text-right"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 + 0.1 }}
        >
          <div
            className={[
              "text-lg font-bold",
              payout.status === "failed"
                ? "text-slate-400 dark:text-slate-500 line-through"
                : "text-foreground",
            ].join(" ")}
          >
            {formatCurrency(payout.amount)}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PayoutListItem;
