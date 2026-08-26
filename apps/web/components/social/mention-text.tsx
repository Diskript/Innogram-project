import Link from "next/link";
import { cn } from "@/lib/utils";

const MENTION_RE = /@(\w{1,30})/g;

export function MentionText({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const parts = content.split(MENTION_RE);
  const nodes: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1 && part) {
      nodes.push(
        <Link
          key={key++}
          href={`/profile/${part}`}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          @{part}
        </Link>,
      );
    } else if (part) {
      nodes.push(<span key={key++}>{part}</span>);
    }
  }

  return (
    <p
      className={cn(
        "whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200",
        className,
      )}
    >
      {nodes}
    </p>
  );
}
