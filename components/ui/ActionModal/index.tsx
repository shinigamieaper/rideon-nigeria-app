"use client";

import React, { useMemo } from "react";

import Button, { type ButtonVariant } from "../Button";
import { Modal } from "../Modal";

export interface ActionModalProps
  extends React.ComponentPropsWithoutRef<"div"> {
  isOpen: boolean;
  onClose: () => void;

  title: string;
  description?: React.ReactNode;

  confirmText: string;
  cancelText?: string;
  confirmVariant?: ButtonVariant;

  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonValue?: string;
  onReasonValueChange?: (next: string) => void;
  requireReason?: boolean;

  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export default function ActionModal({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  confirmVariant = "primary",
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter reason...",
  reasonValue,
  onReasonValueChange,
  requireReason,
  loading,
  confirmDisabled,
  onConfirm,
  ...props
}: ActionModalProps) {
  const reasonOk = useMemo(() => {
    if (!requireReason) return true;
    return Boolean(String(reasonValue || "").trim());
  }, [requireReason, reasonValue]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} {...props}>
      {description ? <div className="mb-4">{description}</div> : null}

      {onReasonValueChange ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {reasonLabel}
          </label>
          <textarea
            value={reasonValue || ""}
            onChange={(e) => onReasonValueChange(e.target.value)}
            placeholder={reasonPlaceholder}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          className="flex-1"
          onClick={() => void onConfirm()}
          disabled={Boolean(loading || confirmDisabled || !reasonOk)}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
