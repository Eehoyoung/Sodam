"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  updateManagerPermissions,
  LEGAL_GATED_PERMISSIONS,
  PERMISSION_LABEL,
  type ManagerPermission,
  type ManagerView,
} from "@/lib/managers";
import { handleMutationError } from "@/lib/mutation-error";

const ASSIGNABLE_PERMISSIONS = Object.keys(PERMISSION_LABEL) as ManagerPermission[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: number;
  manager: ManagerView | null;
  employeeName: string;
}

/** 매니저 권한 수정 다이얼로그 — 권한 확장(신규 권한 추가)은 재서명이 필요할 수 있다(백엔드 판단). */
export function ManagerEditPermissionsDialog({ open, onOpenChange, storeId, manager, employeeName }: Props) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<Set<ManagerPermission>>(new Set());

  useEffect(() => {
    if (manager) setPermissions(new Set(manager.permissions));
  }, [manager]);

  function togglePermission(p: ManagerPermission) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () => updateManagerPermissions(storeId, manager!.employeeId, Array.from(permissions)),
    onSuccess: (result) => {
      if (result.signatureRequired) {
        toast.success("권한이 확장돼 재서명 요청을 보냈어요. 서명 완료 후 적용돼요.");
      } else {
        toast.success("권한을 수정했어요.");
      }
      queryClient.invalidateQueries({ queryKey: ["store", storeId, "managers"] });
      onOpenChange(false);
    },
    onError: (err) => handleMutationError(err, "권한 수정에 실패했어요."),
  });

  if (!manager) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{employeeName} 권한 수정</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={permissions.size === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
