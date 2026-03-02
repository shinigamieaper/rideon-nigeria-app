"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ChatWindow from "@/components/driver/messages/ChatWindow";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default function DriverConversationPage({ params }: PageProps) {
  const { conversationId } = use(params);
  const router = useRouter();
  const [otherParticipantName, setOtherParticipantName] =
    React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login?next=/driver/messages");
        return;
      }

      // Fetch conversation details to get participant name
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/messages/${encodeURIComponent(conversationId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const name =
            typeof data?.other?.name === "string" && data.other.name.trim()
              ? data.other.name.trim()
              : "Unknown";
          setOtherParticipantName(name);
        }
      } catch (e) {
        console.error("Failed to fetch conversation details", e);
        setOtherParticipantName("Unknown");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [conversationId, router]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 bg-background text-foreground"
      style={{ top: "calc(64px + var(--brand-banner-h, 0px))" }}
    >
      <ChatWindow
        conversationId={conversationId}
        otherParticipantName={otherParticipantName}
      />
    </div>
  );
}
