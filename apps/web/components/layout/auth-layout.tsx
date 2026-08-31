import { type ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="aurora flex min-h-screen items-center justify-center px-4">
      {children}
    </div>
  );
}
