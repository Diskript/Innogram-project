"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  FileDown,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui-kit/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui-kit/alert-dialog";
import { deleteMessage, editMessage, type ChatMessage } from "@/lib/chat";
import { getAssetBlobUrl } from "@/lib/media";
import { useAuth } from "@/contexts/auth-context";

function AssetImage({ assetId }: { assetId: string }) {
  const { data: url } = useQuery({
    queryKey: ["asset-blob", assetId],
    queryFn: () => getAssetBlobUrl(assetId),
    staleTime: Infinity,
  });
  if (!url) {
    return <div className="h-40 w-60 animate-pulse rounded-lg bg-secondary" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URLs are runtime object URLs; next/image optimization does not apply
    <img
      src={url}
      alt="Attachment"
      className="max-h-64 max-w-[260px] rounded-lg object-cover"
    />
  );
}

export function MessageItem({
  message,
  compact,
}: {
  message: ChatMessage;
  conversationId: string;
  compact: boolean;
}) {
  const { user } = useAuth();
  const mine = message.senderId === user?.userId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const images = message.assets.filter((a) => a.fileType.startsWith("image/"));
  const files = message.assets.filter((a) => !a.fileType.startsWith("image/"));

  const saveEdit = async () => {
    const content = draft.trim();
    if (content.length === 0) return;
    try {
      await editMessage(message.id, content);
    } finally {
      setEditing(false);
    }
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actions = (position: "top" | "bottom") =>
    position === "top" ? (
      <div className="mb-1 hidden max-lg:hidden gap-1 group-hover:flex">
        {mine && (
          <button
            type="button"
            title="Edit message"
            onClick={() => setEditing(true)}
            className="shadow-overlay flex size-8 items-center justify-center rounded-md bg-popover text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          title="Copy text"
          onClick={() => void copyText()}
          className="shadow-overlay flex size-8 items-center justify-center rounded-md bg-popover text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
        {mine && (
          <button
            type="button"
            title="Delete message"
            onClick={() => setConfirmDelete(true)}
            className="shadow-overlay flex size-8 items-center justify-center rounded-md bg-popover text-destructive transition-colors hover:bg-accent"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    ) : null;

  return (
    <div
      className={`group flex gap-2 ${mine ? "justify-end" : "justify-start"} ${
        compact ? "mt-0.5" : "mt-2"
      }`}
    >
      {mine && actions("top")}
      <div className="max-w-[72%]">
        {editing ? (
          <div className="rounded-xl border border-ring/50 bg-card p-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void saveEdit();
                }
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraft(message.content);
                }
              }}
              className="w-full resize-none bg-transparent text-sm outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2 text-[11px]">
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(message.content);
                }}
                className="flex max-lg:min-h-8 items-center rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveEdit()}
                className="max-lg:min-h-11 rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`relative rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed transition-colors duration-150 ${
              mine
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md border border-border bg-secondary"
            }`}
          >
            {message.content && (
              <p className="break-words whitespace-pre-wrap">
                {message.content}
              </p>
            )}
            {images.length > 0 && (
              <div
                className={`flex flex-wrap gap-2 ${message.content ? "mt-2" : ""}`}
              >
                {images.map((a) => (
                  <AssetImage key={a.id} assetId={a.assetId} />
                ))}
              </div>
            )}
            {files.map((a) => (
              <a
                key={a.id}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="mt-2 flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-2 text-xs"
              >
                <FileDown className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-[160px] truncate">{a.fileName}</span>
              </a>
            ))}
            <div
              className={`font-meta mt-1 text-right text-[10px] ${
                mine ? "text-primary-foreground/60" : "text-muted-foreground"
              }`}
            >
              {message.updatedAt !== message.createdAt && (
                <span className="mr-1 opacity-70">edited</span>
              )}
              {new Date(message.createdAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="absolute -top-2 right-2 hidden group-hover:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <span className="flex size-8 items-center justify-center rounded-md border border-border bg-popover text-muted-foreground">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {mine && (
                    <DropdownMenuItem onSelect={() => setEditing(true)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit message
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => void copyText()}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy text
                  </DropdownMenuItem>
                  {mine && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete message
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
      {!mine && actions("top")}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. The message disappears for everyone in
              the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-[10px] border-l-2 border-primary/40 bg-secondary px-3 py-2 text-[12.5px]">
            {message.content || "(attachment)"}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                void deleteMessage(message.id).then(() =>
                  setConfirmDelete(false),
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
