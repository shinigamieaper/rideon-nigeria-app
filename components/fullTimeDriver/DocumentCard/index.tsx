"use client";

import React from "react";
import { motion } from "motion/react";
import {
  FileText,
  CheckCircle2,
  Upload,
  Eye,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Clock,
} from "lucide-react";

export interface DocumentCardProps
  extends React.ComponentPropsWithoutRef<"div"> {
  title: string;
  status: "uploaded" | "not_uploaded" | "reviewing" | "rejected";
  required?: boolean;
  fileUrl?: string | null;
  onUpload?: () => void;
  onReplace?: () => void;
  onView?: () => void;
  isUploading?: boolean;
}

const statusConfig = {
  uploaded: {
    icon: CheckCircle2,
    label: "Uploaded",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200/50 dark:border-emerald-800/30",
  },
  not_uploaded: {
    icon: Clock,
    label: "Not Uploaded",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200/50 dark:border-slate-700/30",
  },
  reviewing: {
    icon: Clock,
    label: "Under Review",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200/50 dark:border-amber-800/30",
  },
  rejected: {
    icon: AlertCircle,
    label: "Rejected",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200/50 dark:border-red-800/30",
  },
};

const DocumentCard: React.FC<DocumentCardProps> = ({
  title,
  status,
  required = false,
  fileUrl,
  onUpload,
  onReplace,
  onView,
  isUploading = false,
  className,
  ...rest
}) => {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const hasFile =
    status === "uploaded" || status === "reviewing" || status === "rejected";

  return (
    <motion.div
      className={[
        "rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm",
        "border border-slate-200/80 dark:border-slate-800/60",
        "p-4 transition-all duration-200",
        "hover:shadow-md hover:border-slate-300/80 dark:hover:border-slate-700/60",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={[
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            config.bg,
            config.border,
            "border",
          ].join(" ")}
        >
          <FileText className={["w-5 h-5", config.color].join(" ")} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h4>
            {required && (
              <span className="flex-shrink-0 text-[10px] font-medium text-red-500 uppercase tracking-wider">
                Required
              </span>
            )}
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1.5 mt-1">
            <StatusIcon className={["w-3.5 h-3.5", config.color].join(" ")} />
            <span className={["text-xs font-medium", config.color].join(" ")}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasFile && fileUrl && (
            <motion.button
              onClick={onView}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                "hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors",
              ].join(" ")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </motion.button>
          )}

          {hasFile ? (
            <motion.button
              onClick={onReplace}
              disabled={isUploading}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white",
                "shadow-sm hover:shadow-md transition-all",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
              whileHover={{ scale: isUploading ? 1 : 1.02 }}
              whileTap={{ scale: isUploading ? 1 : 0.98 }}
            >
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Replace
            </motion.button>
          ) : (
            <motion.button
              onClick={onUpload}
              disabled={isUploading}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white",
                "shadow-sm hover:shadow-md transition-all",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
              whileHover={{ scale: isUploading ? 1 : 1.02 }}
              whileTap={{ scale: isUploading ? 1 : 0.98 }}
            >
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Upload
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentCard;
