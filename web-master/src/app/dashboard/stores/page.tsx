"use client";

import Link from "next/link";
import { Store as StoreIcon, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreContext } from "@/lib/store-context";

export default function StoresPage() {
  const { stores, isLoading } = useStoreContext();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (stores.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 매장이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">매장관리</h1>
        <p className="text-sm text-muted-foreground">
          매장 {stores.length}곳을 관리하고 있습니다.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <Link key={store.id} href={`/dashboard/stores/${store.id}`}>
            <Card className="h-full border-border transition-colors hover:border-[var(--brand-coral)]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]">
                    <StoreIcon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{store.storeName}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>{store.fullAddress}</p>
                <div className="flex items-center gap-4 pt-1">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    직원 {store.employeeCount}명
                  </span>
                  <span className="flex items-center gap-1">
                    <Wallet className="size-3.5" />
                    시급 {store.storeStandardHourWage.toLocaleString()}원
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
