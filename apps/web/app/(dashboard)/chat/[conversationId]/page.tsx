"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useChat } from "@/contexts/chat-context";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { ConversationHeader } from "@/components/chat/conversation-header";

export default function ConversationThreadPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const {
    setActiveConversationId,
    joinConversation,
    leaveConversation,
    markRead,
  } = useChat();

  useEffect(() => {
    setActiveConversationId(conversationId);
    joinConversation(conversationId);
    void markRead(conversationId);

    const onFocus = () => void markRead(conversationId);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      leaveConversation(conversationId);
      setActiveConversationId(null);
    };
  }, [
    conversationId,
    setActiveConversationId,
    joinConversation,
    leaveConversation,
    markRead,
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <ConversationHeader conversationId={conversationId} />
      <MessageList conversationId={conversationId} />
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
