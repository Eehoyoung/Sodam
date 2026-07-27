"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useStoreContext } from "@/lib/store-context";
import { fetchStoreEmployees } from "@/lib/stores";
import {
  fetchManagers,
  fetchDelegationAudit,
  revokeManager,
  PERMISSION_LABEL,
  type ManagerView,
} from "@/lib/managers";
import { handleMutationError } from "@/lib/mutation-error";
import { ManagerAppointDialog } from "@/components/managers/manager-appoint-dialog";
import { ManagerEditPermissionsDialog } from "@/components/managers/manager-edit-permissions-dialog";

const SIGNATURE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  READY: "서명대기",
  IN_PROGRESS: "서명진행중",
  VERIFIED: "서명완료",
  EXPIRED: "만료됨",
  DECLINED: "거부됨",
  FAILED: "실패",
  CANCELLED: "취소됨",
  MANUAL_REISSUE_REQUIRED: "재발송필요",
};

const AUDIT_ACTION_LABEL: Record<string, string> = {
  GRANT_DRAFTED: "임명 초안 작성",
  SIGN_REQUESTED: "서명 요청",
  SIGN_VERIFIED: "서명 완료",
  ACTIVATED: "권한 활성화",
  MODIFIED: "권한 수정",
  EXPANSION_STAGED: "권한 확장 대기",
  REVOKED: "위임 회수",
  AUTO_REVOKED: "자동 회수",
  FROZEN: "권한 동결",
  PAYROLL_CONFIRMED: "급여 확정",
  CONTRACT_DELEGATION_USED: "근로계약 대리 사용",
};

export default function ManagersPage() {
  const { selectedStore } = useStoreContext();
  const queryClient = useQueryClient();
  const [appointOpen, setAppointOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagerView | null>(null);

  const managersQueryKey = ["store", selectedStore?.id, "managers"];
  const { data: managers, isLoading } = useQuery({
    queryKey: managersQueryKey,
    queryFn: () => fetchManagers(selectedStore!.id),
    enabled: !!selectedStore,
  });

  const { data: employees } = useQuery({
    queryKey: ["store", selectedStore?.id, "employees"],
    queryFn: () => fetchStoreEmployees(selectedStore!.id),
    enabled: !!selectedStore,
  });

  const { data: audits, isLoading: auditLoading } = useQuery({
    queryKey: ["store", selectedStore?.id, "delegation-audit"],
    queryFn: () => fetchDelegationAudit(selectedStore!.id),
    enabled: !!selectedStore,
  });

  const nameOf = (employeeId: number) => employees?.find((e) => e.id === employeeId)?.name ?? `#${employeeId}`;

  const revokeMutation = useMutation({
    mutationFn: (employeeId: number) => revokeManager(selectedStore!.id, employeeId),
    onSuccess: () => {
      toast.success("매니저 위임을 회수했어요.");
      queryClient.invalidateQueries({ queryKey: managersQueryKey });
      queryClient.invalidateQueries({ queryKey: ["store", selectedStore?.id, "delegation-audit"] });
    },
    onError: (err) => handleMutationError(err, "회수에 실패했어요."),
  });

  if (!selectedStore) {
    return <p className="text-sm text-muted-foreground">먼저 매장을 선택해 주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">매니저</h1>
          <p className="text-sm text-muted-foreground">{selectedStore.storeName}</p>
        </div>
        <Button className="gap-1.5" onClick={() => setAppointOpen(true)}>
          <UserPlus className="size-4" />
          매니저 임명
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">매니저 목록</TabsTrigger>
          <TabsTrigger value="audit">위임 감사이력</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="pt-4">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !managers || managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">임명된 매니저가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>서명 상태</TableHead>
                  <TableHead>활성 여부</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((m) => (
                  <TableRow key={m.employeeId}>
                    <TableCell className="font-medium">{nameOf(m.employeeId)}</TableCell>
                    <TableCell className="max-w-72">
                      <div className="flex flex-wrap gap-1">
                        {m.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {PERMISSION_LABEL[p]}
                          </Badge>
                        ))}
                      </div>
                      {m.pendingPermissions && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          서명 대기중인 확장 권한 {m.pendingPermissions.length}건
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.signatureStatus === "VERIFIED" ? "default" : "secondary"}>
                        {SIGNATURE_STATUS_LABEL[m.signatureStatus] ?? m.signatureStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.active ? "활성" : "비활성"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditTarget(m)}>
                          권한 수정
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button size="sm" variant="outline" className="text-destructive" />}>
                            회수
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{nameOf(m.employeeId)}의 매니저 위임을 회수할까요?</AlertDialogTitle>
                              <AlertDialogDescription>
                                회수 즉시 매니저 권한이 모두 사라지고 일반 직원으로 되돌아갑니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction onClick={() => revokeMutation.mutate(m.employeeId)}>
                                회수
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          {auditLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !audits || audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">위임 이력이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시각</TableHead>
                  <TableHead>직원</TableHead>
                  <TableHead>동작</TableHead>
                  <TableHead>행위자</TableHead>
                  <TableHead>접근경로</TableHead>
                  <TableHead>사유</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((a, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{a.createdAt}</TableCell>
                    <TableCell>{nameOf(a.employeeId)}</TableCell>
                    <TableCell>{AUDIT_ACTION_LABEL[a.action] ?? a.action}</TableCell>
                    <TableCell>{a.actorType === "MASTER" ? "사장" : a.actorType === "MANAGER" ? "매니저" : "시스템"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.accessChannel === "WEB" ? "웹" : "모바일"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.reason ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <ManagerAppointDialog
        open={appointOpen}
        onOpenChange={setAppointOpen}
        storeId={selectedStore.id}
        existingManagerIds={(managers ?? []).map((m) => m.employeeId)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["store", selectedStore.id, "delegation-audit"] })}
      />
      <ManagerEditPermissionsDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        storeId={selectedStore.id}
        manager={editTarget}
        employeeName={editTarget ? nameOf(editTarget.employeeId) : ""}
      />
    </div>
  );
}
