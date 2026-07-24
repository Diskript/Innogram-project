import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function Avatar({
  src,
  alt = "",
  size = "md",
  className,
}: AvatarProps) {
  const initials = alt
    ? alt
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
        sizeClasses[size],
        className,
      )}
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}