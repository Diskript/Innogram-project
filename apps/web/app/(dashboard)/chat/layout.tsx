import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import { ChatShell } from "@/components/chat/chat-shell";
import "./chat-theme.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
});

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`chat-root ${sora.variable} h-full`}>
      <ChatShell>{children}</ChatShell>
    </div>
  );
}
