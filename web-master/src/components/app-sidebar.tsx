"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  Clock,
  CalendarRange,
  Wallet,
  ShieldCheck,
  Briefcase,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * 사이드바 메뉴 구성 — 03_UI_UX_설계가이드.md §1 IA(정보구조)를 그대로 따른다.
 * Phase 0 은 셸만 제공하므로 실제 화면은 대부분 준비 중(placeholder) — Phase 1+ 에서 채워진다.
 */
const NAV_ITEMS = [
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/dashboard/stores", label: "매장관리", icon: Store },
  { href: "/dashboard/employees", label: "직원관리", icon: Users },
  { href: "/dashboard/attendance", label: "출퇴근", icon: Clock },
  { href: "/dashboard/schedule", label: "스케줄", icon: CalendarRange },
  { href: "/dashboard/payroll", label: "급여", icon: Wallet },
  { href: "/dashboard/managers", label: "매니저", icon: ShieldCheck },
  { href: "/dashboard/recruiting", label: "구인채용", icon: Briefcase },
  { href: "/dashboard/settings", label: "설정", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-[var(--brand-coral)] to-[var(--brand-teal)]" />
          <span className="text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            소담 사장님 웹
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
