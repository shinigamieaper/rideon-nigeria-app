"use client";

import { ConversationList } from "@/components";

export default function Page() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ConversationList
        basePath="/app/hire-a-driver/messages"
        supportSource="placement_portfolio"
        mode="placement"
      />
    </div>
  );
}
