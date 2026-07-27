"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Send } from "lucide-react";
import { fetchUserDetail } from "@/lib/employee-detail";
import { fetchEmployeeWage, updateEmployeeWage } from "@/lib/wage";
import {
  downloadLaborContractPdf,
  fetchLaborContractsForEmployee,
  sendLaborContract,
} from "@/lib/labor-contracts";
import { useStoreContext } from "@/lib/store-context";
import { handleMutationError } from "@/lib/mutation-error";

const GRADE_LABEL: Record<string, string> = {
  MASTER: "사장",
  EMPLOYEE: "직원",
  MANAGER: "매니저",
};

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const { selectedStore } = useStoreContext();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUserDetail(userId),
    enabled: Number.isFinite(userId),
    retry: false,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error || !user) {
    return <p className="text-sm text-destructive">직원 정보를 불러올 수 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
        <Badge variant="secondary">{user.role ? (GRADE_LABEL[user.role] ?? user.role) : "-"}</Badge>
      </div>

      <Card className="border-border">
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          <InfoRow label="이메일" value={user.email} />
          <InfoRow label="연락처" value={user.phone ?? "-"} />
          <InfoRow label="생년월일" value={user.birthDate ?? "-"} />
          <InfoRow label="가입일" value={new Date(user.createdAt).toLocaleDateString("ko-KR")} />
          <InfoRow label="프로필 완료" value={user.profileCompleted ? "완료" : "미완료"} />
          <InfoRow label="필수 약관 동의" value={user.consentCompleted ? "완료" : "미완료"} />
        </CardContent>
      </Card>

      {selectedStore && <WageCard employeeId={userId} storeId={selectedStore.id} />}
      {selectedStore && <LaborContractCard employeeId={userId} storeId={selectedStore.id} />}
    </div>
  );
}

/**
 * 근로계약서 상태 조회/추적(Phase 4-c) — 신규 계약 작성 폼은 이번 범위에서 제외했다.
 * `LaborContractCreateRequest`가 임금형태·소정근로시간·고정연장/야간/휴일수당·수습·4대보험 등
 * 근로기준법 필수기재사항을 전부 담는 대형 폼이라(백엔드 DTO 60+ 필드), 상태 조회·발송·PDF
 * 다운로드만 우선 구현하고 작성 폼은 별도 세션에서 범위를 잡아 진행하기로 함(사용자 판단 필요 영역
 * 아님 — 순수 규모 문제라 이번 세션에서 스코프만 명시적으로 좁힘).
 */
function LaborContractCard({ employeeId, storeId }: { employeeId: number; storeId: number }) {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["labor-contracts", storeId, employeeId],
    queryFn: () => fetchLaborContractsForEmployee(storeId, employeeId),
  });
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (contractId: number) => sendLaborContract(storeId, contractId),
    onSuccess: () => {
      toast.success("근로계약서를 발송했어요. 직원이 서명하면 완료돼요.");
      queryClient.invalidateQueries({ queryKey: ["labor-contracts", storeId, employeeId] });
    },
    onError: (err) => handleMutationError(err, "발송에 실패했어요."),
  });

  const pdfMutation = useMutation({
    mutationFn: (contractId: number) =>
      downloadLaborContractPdf(storeId, contractId, `근로계약서_${employeeId}_${contractId}.pdf`),
    onError: () => toast.error("PDF 다운로드에 실패했어요."),
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">근로계약서</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !contracts || contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">작성된 근로계약서가 없습니다(모바일 앱에서 작성).</p>
        ) : (
          contracts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">
                  {c.startDate} ~ {c.endDate ?? "미정"}
                  {!c.minimumWageCompliant && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      최저임금 미달
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.payType === "HOURLY" ? `시급 ${c.hourlyWage?.toLocaleString()}원` : `월급 ${c.monthlyBaseSalary?.toLocaleString()}원`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.signed ? "default" : c.sent ? "secondary" : "outline"}>
                  {c.signed ? "서명완료" : c.sent ? "발송됨(서명대기)" : "임시저장"}
                </Badge>
                {!c.sent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={sendMutation.isPending}
                    onClick={() => sendMutation.mutate(c.id)}
                  >
                    <Send className="size-3.5" />
                    발송
                  </Button>
                )}
                {c.sent && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    disabled={pdfMutation.isPending}
                    onClick={() => pdfMutation.mutate(c.id)}
                    title="PDF 다운로드"
                  >
                    <Download className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function WageCard({ employeeId, storeId }: { employeeId: number; storeId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["wage", employeeId, storeId];
  const [draft, setDraft] = useState("");

  const { data: currentWage, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchEmployeeWage(employeeId, storeId),
  });

  useEffect(() => {
    if (currentWage != null) setDraft(String(currentWage));
  }, [currentWage]);

  const mutation = useMutation({
    mutationFn: (customHourlyWage: number) =>
      updateEmployeeWage({ employeeId, storeId, customHourlyWage, useStoreStandardWage: false }),
    onSuccess: (_data, submittedWage) => {
      toast.success("시급을 변경했어요.");
      // 알려진 백엔드 이슈: GET /api/wages/employee/{id}/store/{id} 가 @Cacheable("stores")로
      // 캐시되는데, updateEmployeeWage 의 evictStoresCacheAfterCommit 이 실제로는 재조회 시
      // 갱신된 값을 반영하지 못하는 사례를 확인했다(직접 재현: 변경 이력엔 새 값이 기록되지만
      // 캐시된 GET은 계속 이전 값을 반환). 백엔드 캐시 버그이지 이 화면의 결함이 아니므로,
      // 재조회에 의존하지 않고 방금 저장에 성공한 값을 그대로 화면에 반영한다(우리가 서버에
      // 보낸 값이므로 신뢰할 수 있음). 캐시 버그 자체는 별도로 백엔드 팀에 보고 필요.
      queryClient.setQueryData(queryKey, submittedWage);
    },
    onError: (err) => handleMutationError(err, "시급 변경에 실패했어요."),
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">시급</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-40" />
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wage">시급(원)</Label>
              <Input
                id="wage"
                type="number"
                min={0}
                step={100}
                className="w-40"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <Button
              disabled={
                !draft ||
                Number(draft) === currentWage ||
                mutation.isPending ||
                Number.isNaN(Number(draft))
              }
              onClick={() => mutation.mutate(Number(draft))}
            >
              변경
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          현재 매장 기준: {currentWage != null ? `${currentWage.toLocaleString()}원` : "-"}
        </p>
      </CardContent>
    </Card>
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
