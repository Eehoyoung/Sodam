"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchPayrollPolicy, updatePayrollPolicy, type PayrollPolicyUpdate, type TaxPolicyType } from "@/lib/payroll";
import { handleMutationError } from "@/lib/mutation-error";

const TAX_POLICY_LABEL: Record<TaxPolicyType, string> = {
  INCOME_TAX_3_3: "소득세 3.3%",
  FOUR_INSURANCES: "4대보험",
};

export function PayrollPolicyCard({ storeId }: { storeId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["store", storeId, "payroll-policy"];

  const { data: policy, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchPayrollPolicy(storeId),
  });

  const [form, setForm] = useState<PayrollPolicyUpdate | null>(null);

  useEffect(() => {
    if (policy) {
      setForm({
        taxPolicyType: policy.taxPolicyType,
        nightWorkRate: policy.nightWorkRate,
        nightWorkStartTime: policy.nightWorkStartTime,
        overtimeRate: policy.overtimeRate,
        regularHoursPerDay: policy.regularHoursPerDay,
        weeklyAllowanceEnabled: policy.weeklyAllowanceEnabled,
      });
    }
  }, [policy]);

  const mutation = useMutation({
    mutationFn: (update: PayrollPolicyUpdate) => updatePayrollPolicy(storeId, update),
    onSuccess: () => {
      toast.success("급여 정책을 저장했어요.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => handleMutationError(err, "저장에 실패했어요."),
  });

  if (isLoading || !form) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>세금 정책</Label>
            <Select
              value={form.taxPolicyType}
              onValueChange={(value) =>
                value && setForm({ ...form, taxPolicyType: value as TaxPolicyType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="선택">
                  {(value: string | null) => (value ? TAX_POLICY_LABEL[value as TaxPolicyType] : "선택")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME_TAX_3_3">소득세 3.3%</SelectItem>
                <SelectItem value="FOUR_INSURANCES">4대보험</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            {/* 22:00 고정 — 근로기준법 §56③. 서버가 다른 값을 거절하므로 입력을 열어두지 않는다. */}
            <Label>야간근무 시작 시각 (법정 22:00 고정)</Label>
            <Input
              type="time"
              readOnly
              disabled
              value={form.nightWorkStartTime.slice(0, 5)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>야간근무 가산율 (1.0~3.0)</Label>
            <Input
              type="number"
              step={0.1}
              min={1}
              max={3}
              value={form.nightWorkRate}
              onChange={(e) => setForm({ ...form, nightWorkRate: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>초과근무 가산율 (1.0~3.0)</Label>
            <Input
              type="number"
              step={0.1}
              min={1}
              max={3}
              value={form.overtimeRate}
              onChange={(e) => setForm({ ...form, overtimeRate: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col gap-2">
            {/* 상한 8h — 근로기준법 §50① 법정 일 소정근로시간. 서버 검증과 같은 값이어야 한다. */}
            <Label>일 기본 근무시간 (1~8)</Label>
            <Input
              type="number"
              step={0.5}
              min={1}
              max={8}
              value={form.regularHoursPerDay}
              onChange={(e) => setForm({ ...form, regularHoursPerDay: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>주휴수당</Label>
            <Select
              value={form.weeklyAllowanceEnabled ? "on" : "off"}
              onValueChange={(value) => setForm({ ...form, weeklyAllowanceEnabled: value === "on" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="선택">
                  {(value: string | null) => (value === "on" ? "적용" : "미적용")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">적용</SelectItem>
                <SelectItem value="off">미적용</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
