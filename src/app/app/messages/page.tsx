import { Metadata } from "next";
import { ConversationList } from "@/components";

export const metadata: Metadata = {
  title: "Messages • RideOn",
};

export default function Page() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ConversationList />
    </div>
  );
}
