import { Metadata } from "next";
import ChatWindow from "@/components/app/messages/ChatWindow";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { conversationId } = await params;
  return { title: `Chat • ${conversationId.slice(0, 6)}… • RideOn` };
}

export default async function Page({ params }: PageProps) {
  const { conversationId } = await params;
  return (
    <div
      className="fixed inset-x-0 bottom-0 bg-background text-foreground"
      style={{ top: "calc(64px + var(--brand-banner-h, 0px))" }}
    >
      <ChatWindow conversationId={conversationId} />
    </div>
  );
}
