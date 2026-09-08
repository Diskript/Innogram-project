"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui-kit/textarea";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui-kit/avatar";
import { searchUsers } from "@/lib/social";
import { initials } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["mentionSearch", mentionQuery],
    queryFn: () => searchUsers(mentionQuery ?? "", 0, 6),
    enabled: mentionQuery !== null && mentionQuery.length > 0,
  });

  const suggested = data?.data ?? [];

  const handleChange = (raw: string) => {
    onChange(raw);
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? raw.length;
    const before = raw.slice(0, caret);
    const match = before.match(/(?:^|\s)@(\w{0,30})$/);
    setMentionQuery(match ? match[1] : null);
  };

  const selectUser = (name: string) => {
    if (mentionQuery === null) {
      return;
    }
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? value.length;
    const match = value.slice(0, caret).match(/(?:^|\s)@(\w{0,30})$/);
    if (!match) {
      return;
    }
    const start = caret - match[0].length;
    const prefix = match[0].startsWith(" ") ? " " : "";
    const nextValue = `${value.slice(0, start)}${prefix}@${name} ${value.slice(caret)}`;
    onChange(nextValue);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
      />
      {mentionQuery !== null && suggested.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-md dark:border-neutral-700 dark:bg-neutral-900">
          {suggested.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user.userName)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Avatar size="sm">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                ) : null}
                <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{user.displayName}</span>{" "}
                <span className="text-neutral-500">@{user.userName}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
