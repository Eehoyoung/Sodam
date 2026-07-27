"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { fetchStoreEmployees } from "@/lib/stores";
import {
  appointManager,
  LEGAL_GATED_PERMISSIONS,
  PERMISSION_LABEL,
  type ManagerPermission,
} from "@/lib/managers";
import { handleMutationError } from "@/lib/mutation-error";

const ASSIGNABLE_PERMISSIONS = Object.keys(PERMISSION_LABEL) as ManagerPermission[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: number;
  existingManagerIds: number[];
  onDone: () => void;
}

/**
 * 매니저 임명 다이얼로그 — 직원 선택 + 권한 체크박스 다중선택 후 전자서명 위임장을 발송한다.
 * CONTRACT_MANAGE·PAYROLL_CONFIRM은 노무사 검토 미완료라 체크박스 자체를 비활성화한다(CLAUDE.md ⛔).
 */
export function ManagerAppointDialog({ open, onOpenChange, storeId, existingManagerIds, onDone }: Props) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [permissions, setPermissions] = useState<Set<ManagerPermission>>(new Set());

  const { data: employees } = useQuery({
    queryKey: ["store", storeId, "employees"],
    queryFn: () => fetchStoreEmployees(storeId),
    enabled: open,
  });

  const candidates = (employees ?? []).filter((e) => !existingManagerIds.includes(e.id));

  function togglePermission(p: ManagerPermission) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function reset() {
    setEmployeeId("");
    setPermissions(new Set());
  }

  const mutation = useMutation({
    mutationFn: () => appointManager(storeId, Number(employeeId), Array.from(permissions)),
    onSuccess: () => {
      toast.success("위임 전자서명 요청을 보냈어요. 직원이 서명을 완료하면 매니저 권한이 활성화돼요.");
      queryClient.invalidateQueries({ queryKey: ["store", storeId, "managers"] });
      onOpenChange(false);
      reset();
      onDone();
    },
    onError: (err) => handleMutationError(err, "매니저 임명에 실패했어요."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>매니저 임명</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>직원</Label>
            <NativeSelect value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="" disabled>
                직원 선택
              </option>
              {candidates.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name}
                </option>
              ))}
            </NativeSelect>
            {candidates.length === 0 && (
              <p className="text-xs text-muted-foreground">임명 가능한 직원이 없습니다(이미 매니저이거나 직원이 없어요).</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>권한</Label>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNABLE_PERMISSIONS.map((p) => {
                const gated = LEGAL_GATED_PERMISSIONS.includes(p);
                return (
                  <label
                    key={p}
                    className={`flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm ${
                      gated ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5"
                      disabled={gated}
                      checked={permissions.has(p)}
                      onChange={() => togglePermission(p)}
                    />
                    {PERMISSION_LABEL[p]}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              급여 확정·근로계약 대리는 노무사 검토가 끝나지 않아 부여할 수 없습니다.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            disabled={!employeeId || permissions.size === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            위임장 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
