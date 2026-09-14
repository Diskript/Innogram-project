import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileTopBar } from "./mobile-top-bar";
import { MobileNav } from "./mobile-nav";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-20 md:p-6 lg:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
