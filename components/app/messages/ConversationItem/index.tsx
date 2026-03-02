import React from "react";

export interface ConversationItemProps
  extends React.ComponentPropsWithoutRef<"button"> {
  id: string;
  name: string;
  avatarUrl?: string | null; // deprecated (ignored)
  lastMessage?: string;
  lastMessageAt?: string | null; // ISO string
  unreadCount?: number;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  return `${day}d ago`;
}

const AVATAR_COLORS = [
  "#00529B",
  "#0f4c81",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#dc2626",
  "#025b4c",
  "#111827",
];
function nameInitials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "RO";
  const parts = n.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b || a || "RO").toUpperCase();
}
function colorFor(name?: string) {
  const s = (name || "RO").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  id,
  name,
  avatarUrl,
  lastMessage,
  lastMessageAt,
  unreadCount = 0,
  className,
  ...rest
}) => {
  const unread = (unreadCount || 0) > 0;
  return (
    <button
      {...rest}
      className={[
        "w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-all duration-200",
        "bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 shadow",
        "hover:shadow-lg hover:-translate-y-[1px]",
        unread ? "font-semibold" : "font-normal",
        className || "",
      ].join(" ")}
      data-conversation-id={id}
    >
      <div className="relative">
        {unread && (
          <span className="absolute -left-2 top-1 h-2 w-2 rounded-full bg-[#00529B]" />
        )}
        <div
          className="h-12 w-12 rounded-full border border-slate-200/80 dark:border-slate-800/60 grid place-items-center text-white text-sm"
          style={{ background: colorFor(name) }}
          aria-label="Conversation avatar"
        >
          {nameInitials(name)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span
            className={[
              "truncate",
              unread
                ? "text-slate-900 dark:text-slate-100"
                : "text-slate-800 dark:text-slate-200",
            ].join(" ")}
          >
            {name}
          </span>
          <time className="shrink-0 text-[11px] text-slate-500">
            {timeAgo(lastMessageAt)}
          </time>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p
            className={[
              "truncate text-[13px]",
              unread
                ? "text-slate-700 dark:text-slate-300"
                : "text-slate-500 dark:text-slate-400",
            ].join(" ")}
          >
            {lastMessage || ""}
          </p>
          {unread && (
            <span className="shrink-0 ml-2 inline-flex h-5 min-w-5 items-center justify-center px-1 rounded-full bg-[#00529B] text-[11px] text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;
