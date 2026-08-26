import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function DashboardLayout({
  children,
  showHeader = true,
}: {
  children: ReactNode;
  showHeader?: boolean;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        {showHeader && <Header />}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
