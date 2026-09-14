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
    <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
      {sendError && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <span>{sendError}</span>
          <button
            onClick={() => void send()}
            className="font-semibold max-lg:min-h-11"
          >
            Retry
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <span
              key={a.id}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                a.error
                  ? "border-destructive/40 text-destructive"
                  : "border-border bg-secondary text-foreground"
              }`}
            >
              {a.fileName}
              <button
                onClick={() =>
                  setAttachments((old) => old.filter((x) => x.id !== a.id))
                }
                aria-label={`Remove ${a.fileName}`}
                className="flex size-6 items-center justify-center max-lg:size-8"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 transition-colors focus-within:border-ring/50">
        <button
          onClick={pickFiles}
          aria-label="Attach files"
          className="flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground max-lg:size-11"
        >
          <Paperclip className="size-4" />
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
          className="max-h-32 min-h-6 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => void send()}
          disabled={!canSend}
          aria-label="Send"
          className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 max-lg:size-11"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
