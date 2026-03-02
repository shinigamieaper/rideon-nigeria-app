"use client";

import React from "react";

export interface MessageInputProps
  extends React.ComponentPropsWithoutRef<"form"> {
  onSend: (message: string) => void | Promise<void>;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  placeholder = "Type a message...",
  className,
  ...rest
}) => {
  const [value, setValue] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const canSend = value.trim().length > 0 && !sending;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend) return;
    const text = value.trim();
    setSending(true);
    try {
      await onSend(text);
      setValue("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "flex items-center gap-2 p-2",
        "rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/60 shadow-lg",
        className || "",
      ].join(" ")}
      {...rest}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-11 rounded-xl px-4 text-sm bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send"
        className={[
          "h-11 w-11 grid place-items-center rounded-xl text-white transition-all duration-200",
          canSend
            ? "bg-[#00529B] hover:opacity-90 shadow-lg shadow-blue-900/30"
            : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed",
        ].join(" ")}
        title="Send"
      >
        {/* paper airplane icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m6 12 13-5-5 13-2.5-5L6 12Z"
          />
        </svg>
      </button>
    </form>
  );
};

export default MessageInput;
