"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { useStoreContext } from "@/lib/store-context";
import { createShift, deleteShift, fetchStoreShifts, updateShift } from "@/lib/schedule";
import { approveTimeOff, fetchStoreTimeOffs, rejectTimeOff } from "@/lib/timeoff";
import { fetchStoreEmployees } from "@/lib/stores";
import type { WorkShift } from "@/lib/backend-types";
import { handleMutationError } from "@/lib/mutation-error";

const WEEKDAY_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

export default function SchedulePage() {
  const { selectedStore } = useStoreContext();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; date: string }
    | { mode: "edit"; shift: WorkShift }
    | null
  >(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; employeeName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryClient = useQueryClient();

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset === 0 ? base : (weekOffset > 0 ? addWeeks(base, weekOffset) : subWeeks(base, -weekOffset));
  }, [weekOffset]);
  const weekEnd = addDays(weekStart, 6);
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(weekEnd, "yyyy-MM-dd");

  const shiftsQueryKey = ["store", selectedStore?.id, "shifts", from, to];
  const timeOffQueryKey = ["store", selectedStore?.id, "timeoff"];

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: shiftsQueryKey,
    queryFn: () => fetchStoreShifts(selectedStore!.id, from, to),
    enabled: !!selectedStore,
  });

  const { data: employees } = useQuery({
    queryKey: ["store", selectedStore?.id, "employees"],
    queryFn: () => fetchStoreEmployees(selectedStore!.id),
    enabled: !!selectedStore,
  });

  const { data: timeOffs, isLoading: timeOffLoading } = useQuery({
    queryKey: timeOffQueryKey,
    queryFn: () => fetchStoreTimeOffs(selectedStore!.id),
    enabled: !!selectedStore,
  });

  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>();
    employees?.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [employees]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const approveTimeOffMutation = useMutation({
    mutationFn: approveTimeOff,
    onSuccess: () => {
      toast.success("휴가 신청을 승인했어요.");
      queryClient.invalidateQueries({ queryKey: timeOffQueryKey });
    },
    onError: (err) => handleMutationError(err, "승인에 실패했어요."),
  });

  const rejectTimeOffMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectTimeOff(id, reason),
    onSuccess: () => {
      toast.success("휴가 신청을 거절했어요.");
      setRejectTarget(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: timeOffQueryKey });
    },
    onError: (err) => handleMutationError(err, "거절에 실패했어요."),
  });

  const pendingTimeOffs = (timeOffs ?? []).filter((t) => t.status === "PENDING");

  if (!selectedStore) {
    return <p className="text-sm text-muted-foreground">먼저 매장을 선택해 주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">스케줄</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "yyyy.MM.dd")} ~ {format(weekEnd, "MM.dd")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            이번주
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {shiftsLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayShifts = (shifts ?? []).filter((s) => s.shiftDate === dayStr);
            return (
              <Card key={dayStr} className="min-h-40 border-border">
                <CardContent className="flex flex-col gap-2 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {WEEKDAY_LABEL[idx]} {format(day, "d")}
                    </span>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setDialogState({ mode: "create", date: dayStr })}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  {dayShifts.length === 0 ? (
                    <span className="text-xs text-muted-foreground/60">-</span>
                  ) : (
                    dayShifts.map((shift) => (
                      <button
                        key={shift.id}
                        onClick={() => setDialogState({ mode: "edit", shift })}
                        className="rounded-lg bg-[var(--brand-teal-soft)] px-2 py-1 text-left text-xs text-foreground transition-opacity hover:opacity-80"
                      >
                        <div className="font-medium">
                          {employeeNameById.get(shift.employeeId) ?? `직원 #${shift.employeeId}`}
                        </div>
                        <div className="text-muted-foreground">
                          {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
                          {shift.crossesMidnight ? " (익일)" : ""}
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">연차·휴무 승인 대기</h2>
        {timeOffLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : pendingTimeOffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">대기 중인 휴가 신청이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingTimeOffs.map((t) => (
              <Card key={t.id} className="border-border">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.employeeName} <Badge variant="secondary" className="ml-1">{t.leaveType}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.startDate} ~ {t.endDate} · {t.consumedDays}일 · {t.reason ?? "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approveTimeOffMutation.isPending}
                      onClick={() => approveTimeOffMutation.mutate(t.id)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={rejectTimeOffMutation.isPending}
                      onClick={() => setRejectTarget({ id: t.id, employeeName: t.employeeName })}
                    >
                      거절
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ShiftDialog
        state={dialogState}
        storeId={selectedStore.id}
        employees={employees ?? []}
        onClose={() => setDialogState(null)}
        queryKey={shiftsQueryKey}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectTarget?.employeeName}님의 휴가 신청을 거절할까요?</DialogTitle>
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
              disabled={!rejectReason.trim() || rejectTimeOffMutation.isPending}
              onClick={() =>
                rejectTarget && rejectTimeOffMutation.mutate({ id: rejectTarget.id, reason: rejectReason })
              }
            >
              거절하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShiftDialog({
  state,
  storeId,
  employees,
  onClose,
  queryKey,
}: {
  state: { mode: "create"; date: string } | { mode: "edit"; shift: WorkShift } | null;
  storeId: number;
  employees: { id: number; name: string }[];
  onClose: () => void;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const isEdit = state?.mode === "edit";

  const [employeeId, setEmployeeId] = useState<string>("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [memo, setMemo] = useState("");

  // 다이얼로그가 새로 열릴 때만 폼 상태 초기화.
  const key = state ? (state.mode === "create" ? `create-${state.date}` : `edit-${state.shift.id}`) : "closed";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    if (state?.mode === "create") {
      setEmployeeId(employees[0] ? String(employees[0].id) : "");
      setShiftDate(state.date);
      setStartTime("09:00");
      setEndTime("18:00");
      setMemo("");
    } else if (state?.mode === "edit") {
      setShiftDate(state.shift.shiftDate);
      setStartTime(state.shift.startTime.slice(0, 5));
      setEndTime(state.shift.endTime.slice(0, 5));
      setMemo(state.shift.memo ?? "");
    }
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createShift(storeId, { employeeId: Number(employeeId), shiftDate, startTime, endTime, memo: memo || undefined }),
    onSuccess: () => {
      toast.success("근무를 등록했어요.");
      invalidate();
      onClose();
    },
    onError: (err) => handleMutationError(err, "등록에 실패했어요."),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!isEdit) throw new Error("no shift");
      return updateShift(storeId, state.shift.id, {
        shiftDate,
        startTime,
        endTime,
        memo: memo || undefined,
        version: state.shift.version,
      });
    },
    onSuccess: () => {
      toast.success("근무를 수정했어요.");
      invalidate();
      onClose();
    },
    onError: (err) => handleMutationError(err, "수정에 실패했어요."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!isEdit) throw new Error("no shift");
      return deleteShift(storeId, state.shift.id);
    },
    onSuccess: () => {
      toast.success("근무를 삭제했어요.");
      invalidate();
      onClose();
    },
    onError: (err) => handleMutationError(err, "삭제에 실패했어요."),
  });

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "근무 수정" : "근무 등록"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label>직원</Label>
              <NativeSelect value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="" disabled>
                  직원 선택
                </option>
                {employees.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>근무 날짜</Label>
            <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>시작 시간</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>종료 시간</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>메모</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="선택 입력" />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              className="gap-1 text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="size-3.5" />
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              disabled={
                !shiftDate ||
                !startTime ||
                !endTime ||
                (!isEdit && !employeeId) ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              onClick={() => (isEdit ? updateMutation.mutate() : createMutation.mutate())}
            >
              {isEdit ? "저장" : "등록"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
