"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Nfc } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchStoreById } from "@/lib/stores";
import { fetchOperatingHours } from "@/lib/operating-hours";
import { deactivateNfcTag, fetchStoreNfcTags } from "@/lib/nfc";
import { handleMutationError } from "@/lib/mutation-error";

export default function StoreDetailPage() {
  const params = useParams<{ id: string }>();
  const storeId = Number(params.id);

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", storeId],
    queryFn: () => fetchStoreById(storeId),
    enabled: Number.isFinite(storeId),
  });

  if (isLoading || !store) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{store.storeName}</h1>
        <p className="text-sm text-muted-foreground">{store.fullAddress}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="hours">운영시간</TabsTrigger>
          <TabsTrigger value="nfc">NFC 태그</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-4">
          <Card className="border-border">
            <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
              <InfoRow label="사업자번호" value={store.businessNumber} />
              <InfoRow label="전화번호" value={store.storePhoneNumber} />
              <InfoRow label="업종" value={store.businessType} />
              <InfoRow label="매장코드" value={store.storeCode} />
              <InfoRow label="기준시급" value={`${store.storeStandardHourWage.toLocaleString()}원`} />
              <InfoRow label="직원 수" value={`${store.employeeCount}명`} />
              <InfoRow label="오늘 출퇴근" value={`${store.todayAttendance ?? 0}건`} />
              <InfoRow
                label="이번달 매출"
                value={store.monthlyRevenue != null ? `${store.monthlyRevenue.toLocaleString()}원` : "-"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="pt-4">
          <OperatingHoursTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="nfc" className="pt-4">
          <NfcTagsTab storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function OperatingHoursTab({ storeId }: { storeId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["store", storeId, "operating-hours"],
    queryFn: () => fetchOperatingHours(storeId),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">운영시간 정보가 없습니다.</p>;

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-2 pt-6">
        {data.operatingHours.map((day) => (
          <div
            key={day.dayOfWeek}
            className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0"
          >
            <span className="font-medium text-foreground">{day.dayOfWeekKorean}</span>
            {day.isClosed ? (
              <Badge variant="secondary">휴무</Badge>
            ) : (
              <span className="text-muted-foreground">{day.operatingTimeString}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NfcTagsTab({ storeId }: { storeId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["store", storeId, "nfc-tags"];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchStoreNfcTags(storeId),
  });

  const deactivateMutation = useMutation({
    mutationFn: (tagPk: number) => deactivateNfcTag(storeId, tagPk),
    onSuccess: () => {
      toast.success("NFC 태그를 비활성화했어요.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => handleMutationError(err, "비활성화에 실패했어요."),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 NFC 태그가 없습니다.</p>;
  }

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-2 pt-6">
        {data.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0"
          >
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Nfc className="size-4 text-muted-foreground" />
              {tag.label ?? tag.tagId}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={tag.active ? "default" : "secondary"}>
                {tag.active ? "활성" : "비활성"}
              </Badge>
              {tag.active && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button size="sm" variant="outline" className="text-destructive" />}>
                    비활성화
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>이 태그를 비활성화할까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        비활성화 즉시 이 태그로는 출근 인증이 차단됩니다. 분실/교체된 태그일 때만 사용하세요.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deactivateMutation.mutate(tag.id)}>
                        비활성화
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          태그 발급(물리 태그 쓰기)은 모바일 앱 전용입니다. 웹에서는 조회·비활성화만 가능합니다.
        </p>
      </CardContent>
    </Card>
  );
}
