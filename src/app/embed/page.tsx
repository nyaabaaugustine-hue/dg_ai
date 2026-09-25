import type { Metadata } from "next";
import { Chat } from "@/components/chat";

export const metadata: Metadata = {
  title: "DEGOONY Assistant",
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-[#0c0e12] p-2">
      <Chat className="h-full border-0 shadow-none" />
    </main>
  );
}
