"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export interface ConversationListItemProps
  extends Omit<React.ComponentPropsWithoutRef<"a">, "href"> {
  conversation: {
    id: string;
    otherParticipantName: string;
    otherParticipantAvatar: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  };
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ConversationListItem({
  conversation,
  className,
  ...props
}: ConversationListItemProps) {
  const hasUnread = conversation.unreadCount > 0;

  // Generate initials if no avatar
  const initials = conversation.otherParticipantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href={`/driver/messages/${conversation.id}`}
      className={[
        "block p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {conversation.otherParticipantAvatar ? (
            <img
              src={conversation.otherParticipantAvatar}
              alt={conversation.otherParticipantName}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
            />
          ) : conversation.otherParticipantName === "RideOn Support" ? (
            <div className="w-12 h-12 rounded-full bg-[#00529B] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h3
              className={[
                "text-sm truncate",
                hasUnread
                  ? "font-bold text-slate-900 dark:text-slate-100"
                  : "font-medium text-slate-800 dark:text-slate-200",
              ].join(" ")}
            >
              {conversation.otherParticipantName}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p
              className={[
                "text-sm truncate flex-1",
                hasUnread
                  ? "font-semibold text-slate-700 dark:text-slate-300"
                  : "text-slate-600 dark:text-slate-400",
              ].join(" ")}
            >
              {conversation.lastMessage}
            </p>
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-[#00529B] flex-shrink-0"></span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
