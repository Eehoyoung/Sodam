"use client";

import { Check, ChevronDown, LogOut, Store as StoreIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useStoreContext } from "@/lib/store-context";

/** 상단바 — 매장 전환(멀티매장) · 프로필/로그아웃. 03_UI_UX_설계가이드.md §1. */
export function SiteHeader() {
  const { user, logout } = useAuth();
  const { stores, selectedStore, setSelectedStoreId, isLoading } = useStoreContext();

  const initial = user?.name?.trim()?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="gap-2" />}
          disabled={isLoading || stores.length === 0}
        >
          <StoreIcon className="size-4" />
          {isLoading ? "불러오는 중..." : (selectedStore?.storeName ?? "매장 없음")}
          {stores.length > 1 && <ChevronDown className="size-3.5 opacity-60" />}
        </DropdownMenuTrigger>
        {stores.length > 0 && (
          <DropdownMenuContent align="start" className="w-56">
            {stores.map((store) => (
              <DropdownMenuItem key={store.id} onClick={() => setSelectedStoreId(store.id)}>
                {store.id === selectedStore?.id && <Check className="size-3.5" />}
                <span className={store.id === selectedStore?.id ? "font-medium" : undefined}>
                  {store.storeName}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
            <Avatar className="size-7">
              <AvatarFallback className="bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {user?.name ?? user?.email ?? "..."}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {user?.userGrade === "ROLE_MASTER" ? "사장" : user?.userGrade === "ROLE_MANAGER" ? "매니저" : user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} variant="destructive">
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
