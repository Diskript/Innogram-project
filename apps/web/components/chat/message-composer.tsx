"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, X } from "lucide-react";
import { useChat } from "@/contexts/chat-context";
import { useAuth } from "@/contexts/auth-context";
import {
  sendMessage,
  uploadChatAttachments,
  type ChatMessage,
} from "@/lib/chat";

type PendingAttachment = {
  id: string;
  fileName: string;
  error?: boolean;
};

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const { user } = useAuth();
  const { markTyping } = useChat();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend =
    (content.trim().length > 0 || attachments.some((a) => !a.error)) &&
    !uploading;

  const pickFiles = () => fileRef.current?.click();

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setSendError(null);
    try {
      const uploaded = await uploadChatAttachments(Array.from(fileList));
      setAttachments((old) => [
        ...old,
        ...uploaded.map((a) => ({ id: a.id, fileName: a.fileName })),
      ]);
    } catch {
      setAttachments((old) => [
        ...old,
        {
          id: `failed-${Date.now()}`,
          fileName: fileList[0].name,
          error: true,
        },
      ]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const send = async () => {
    const text = content.trim();
    const assetIds = attachments.filter((a) => !a.error).map((a) => a.id);
    if (!text && assetIds.length === 0) return;

    setSendError(null);

    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      conversationId,
      senderId: user?.userId ?? "",
      content: text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: user?.userId ?? "",
        userName: "",
        displayName: user?.email ?? "",
        avatarUrl: null,
      },
      assets: [],
    };

    queryClient.setQueryData<{
      pages: { data: ChatMessage[]; total: number }[];
      pageParams: unknown[];
    }>(["chat", "messages", conversationId], (old) => {
      if (!old) return old;
      const pages = [...old.pages];
      const last = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...last,
        data: [...last.data, optimistic],
      };
      return { ...old, pages };
    });

    setContent("");
    const sentAttachments = attachments;
    setAttachments([]);

    try {
      const saved = await sendMessage(conversationId, {
        content: text,
        ...(assetIds.length ? { assetIds } : {}),
      });
      queryClient.setQueryData<{
        pages: { data: ChatMessage[]; total: number }[];
        pageParams: unknown[];
      }>(["chat", "messages", conversationId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, i) =>
            i === old.pages.length - 1
              ? {
                  ...page,
                  data: page.data.map((m) =>
                    m.id === optimistic.id ? saved : m,
                  ),
                }
              : page,
          ),
        };
      });
    } catch {
      setSendError("Message failed to send.");
      setContent(text);
      setAttachments(sentAttachments);
      queryClient.setQueryData<{
        pages: { data: ChatMessage[]; total: number }[];
        pageParams: unknown[];
      }>(["chat", "messages", conversationId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, i) =>
            i === old.pages.length - 1
              ? {
                  ...page,
                  data: page.data.filter((m) => m.id !== optimistic.id),
                }
              : page,
          ),
        };
      });
    }
  };

  return (
    <div className="px-4 pb-4 pt-1">
      {sendError && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-[rgba(232,80,60,0.4)] bg-[rgba(232,80,60,0.08)] px-3 py-1.5 text-xs text-[#ff7a6e]">
          <span>{sendError}</span>
          <button onClick={() => void send()} className="font-semibold">
            Retry
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.id}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${
                a.error
                  ? "border-[rgba(232,80,60,0.5)] text-[#ff7a6e]"
                  : "border-[var(--chat-border-hover)] bg-[#2a2350] text-[var(--chat-text)]"
              }`}
            >
              {a.fileName}
              <button
                onClick={() =>
                  setAttachments((old) => old.filter((x) => x.id !== a.id))
                }
                aria-label={`Remove ${a.fileName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3.5 py-2.5 transition-all focus-within:border-[rgba(240,166,60,0.55)] focus-within:shadow-[0_0_0_3px_rgba(240,166,60,0.12),0_0_28px_rgba(240,166,60,0.15)]">
        <button
          onClick={pickFiles}
          aria-label="Attach files"
          className="text-[var(--chat-text-secondary)] transition-colors hover:text-[var(--chat-amber)]"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (e.target.value.trim()) markTyping(conversationId);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) void send();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Message…"
          className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-[var(--chat-text-tertiary)]"
        />
        <button
          onClick={() => void send()}
          disabled={!canSend}
          aria-label="Send"
          className="glow-soft flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[var(--chat-amber-light)] to-[var(--chat-amber-deep)] text-[var(--chat-amber-ink)] disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
