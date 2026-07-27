"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useStoreContext } from "@/lib/store-context";

interface DashboardSummary {
  store: {
    id: number;
    storeName: string;
    employeeCount: number;
    todayAttendance: number | null;
    monthlyRevenue: number | null;
    monthlyLaborCost: number | null;
  };
  pendingApprovals: number;
  bffDurationMs: number;
}

async function fetchDashboardSummary(storeId: number): Promise<DashboardSummary> {
  const res = await fetch(`/api/bff/dashboard?storeId=${storeId}`);
  if (!res.ok) {
    throw new Error("대시보드 요약을 불러오지 못했습니다.");
  }
  return res.json();
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { selectedStore, isLoading: storeLoading } = useStoreContext();

  const { data, isLoading } = useQuery({
    queryKey: ["bff", "dashboard", selectedStore?.id],
    queryFn: () => fetchDashboardSummary(selectedStore!.id),
    enabled: !!selectedStore,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          안녕하세요{user?.name ? `, ${user.name}님` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {selectedStore ? selectedStore.storeName : "사장님 웹 콘솔 홈 대시보드"}
        </p>
      </div>

      {storeLoading || isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">오늘 출퇴근</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{data.store.todayAttendance ?? 0}건</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">승인 대기</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[var(--brand-amber)]">{data.pendingApprovals}건</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">이번달 매출</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {data.store.monthlyRevenue != null ? `${data.store.monthlyRevenue.toLocaleString()}원` : "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
