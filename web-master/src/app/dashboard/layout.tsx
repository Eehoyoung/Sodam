"use client";

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-provider";
import { StoreProvider } from "@/lib/store-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    // AuthProvider 가 이미 /login 으로 리다이렉트를 트리거했다 — 전환 중 깜빡임 방지용 빈 화면.
    return null;
  }

  return (
    <StoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex-1 overflow-auto bg-background p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </StoreProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <DashboardGate>{children}</DashboardGate>
      </AuthProvider>
    </QueryProvider>
  );
}
