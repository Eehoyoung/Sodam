"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStoreContext } from "@/lib/store-context";
import {
  approveAttendanceRequest,
  fetchApprovalRequests,
  fetchStoreAttendance,
  rejectAttendanceRequest,
} from "@/lib/attendance";
import type { AttendanceApprovalRequestItem } from "@/lib/backend-types";
import { useStoreRealtime } from "@/lib/use-store-realtime";
import { handleMutationError } from "@/lib/mutation-error";

function isoDateTime(date: Date) {
  // 백엔드가 요구하는 ISO LocalDateTime(yyyy-MM-dd'T'HH:mm:ss) — offset/Z 없이.
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

export default function AttendancePage() {
  const { selectedStore } = useStoreContext();
  const storeId = selectedStore?.id ?? null;
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<AttendanceApprovalRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const today = new Date();
  const startDate = isoDateTime(startOfDay(today));
  const endDate = isoDateTime(endOfDay(today));

  const attendanceQueryKey = ["store", storeId, "attendance", startDate, endDate];
  const approvalsQueryKey = ["store", storeId, "approval-requests"];

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: attendanceQueryKey,
    queryFn: () => fetchStoreAttendance(storeId!, startDate, endDate),
    enabled: !!storeId,
  });

  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: approvalsQueryKey,
    queryFn: () => fetchApprovalRequests(storeId!),
    enabled: !!storeId,
  });

  // 실시간: 출퇴근/승인 이벤트 발생 시 두 쿼리 모두 무효화(재조회) — 폴링 대체.
  useStoreRealtime(storeId, [attendanceQueryKey, approvalsQueryKey]);

  function invalidateBoth() {
    queryClient.invalidateQueries({ queryKey: attendanceQueryKey });
    queryClient.invalidateQueries({ queryKey: approvalsQueryKey });
  }

  const approveMutation = useMutation({
    mutationFn: approveAttendanceRequest,
    onSuccess: () => {
      toast.success("출퇴근 요청을 승인했어요.");
      invalidateBoth();
    },
    onError: (err) => handleMutationError(err, "승인에 실패했어요."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectAttendanceRequest(id, reason),
    onSuccess: () => {
      toast.success("출퇴근 요청을 거절했어요.");
      setRejectTarget(null);
      setRejectReason("");
      invalidateBoth();
    },
    onError: (err) => handleMutationError(err, "거절에 실패했어요."),
  });

  const pendingApprovals = (approvals ?? []).filter((a) => a.status === "PENDING");
  const workingCount = (attendance ?? []).filter((a) => a.checkInTime && !a.checkOutTime).length;

  if (!selectedStore) {
    return <p className="text-sm text-muted-foreground">먼저 매장을 선택해 주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">출퇴근 현황</h1>
        <p className="text-sm text-muted-foreground">
          {selectedStore.storeName} · {format(today, "yyyy.MM.dd")} · 실시간 연동
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">근무중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--brand-coral)]">{workingCount}명</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 총 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{attendance?.length ?? 0}건</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">승인 대기</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--brand-amber)]">{pendingApprovals.length}건</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">오늘 출퇴근 기록</h2>
        {attendanceLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !attendance || attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">오늘 출퇴근 기록이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직원</TableHead>
                <TableHead>출근</TableHead>
                <TableHead>퇴근</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.employeeName}</TableCell>
                  <TableCell>
                    {record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : "-"}
                  </TableCell>
                  <TableCell>
                    {record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : "-"}
                  </TableCell>
                  <TableCell>
                    {record.checkOutTime ? (
                      <Badge variant="secondary">퇴근완료</Badge>
                    ) : (
                      <Badge className="gap-1">
                        <Clock className="size-3" />
                        근무중
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">사장승인 대기 요청</h2>
        {approvalsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingApprovals.length === 0 ? (
          <p className="text-sm text-muted-foreground">대기 중인 승인 요청이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingApprovals.map((req) => (
              <Card key={req.id} className="border-border">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{req.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.type} · {format(new Date(req.requestedTime), "HH:mm")} 요청
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(req.id)}
                    >
                      <Check className="size-3.5" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      disabled={rejectMutation.isPending}
                      onClick={() => setRejectTarget(req)}
                    >
                      <X className="size-3.5" />
                      거절
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectTarget?.employeeName}님의 요청을 거절할까요?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="거절 사유를 입력해 주세요."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
            >
              거절하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
