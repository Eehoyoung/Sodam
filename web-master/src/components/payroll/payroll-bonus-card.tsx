"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { fetchStoreEmployees } from "@/lib/stores";
import { createBonus, fetchEmployeeBonuses, type BonusPaymentTiming } from "@/lib/payroll";
import { handleMutationError } from "@/lib/mutation-error";
import { format } from "date-fns";

const TIMING_LABEL: Record<BonusPaymentTiming, string> = {
  IMMEDIATE_CASH: "즉시 현금 지급",
  INCLUDED_IN_PAYROLL: "다음 급여 합산",
};

export function PayrollBonusCard({ storeId }: { storeId: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const { data: employees } = useQuery({
    queryKey: ["store", storeId, "employees"],
    queryFn: () => fetchStoreEmployees(storeId),
  });

  const currentEmployeeId = selectedEmployeeId || (employees?.[0] ? String(employees[0].id) : "");

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ["store", storeId, "bonuses", currentEmployeeId],
    queryFn: () => fetchEmployeeBonuses(storeId, Number(currentEmployeeId)),
    enabled: !!currentEmployeeId,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">직원</Label>
          <Select value={currentEmployeeId} onValueChange={(v) => v && setSelectedEmployeeId(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="직원 선택">
                {(value: string | null) => employees?.find((e) => String(e.id) === value)?.name ?? "직원 선택"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {employees?.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-1" />}>
            <Plus className="size-3.5" />
            보너스 등록
          </DialogTrigger>
          <BonusCreateForm
            storeId={storeId}
            employees={employees ?? []}
            defaultEmployeeId={currentEmployeeId}
            onClose={() => setDialogOpen(false)}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">불러오는 중...</CardContent>
        </Card>
      ) : !bonuses || bonuses.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 보너스가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bonuses.map((b) => (
            <Card key={b.id} className="border-border">
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.amount.toLocaleString()}원</p>
                  <p className="text-xs text-muted-foreground">
                    {b.bonusDate} · {b.reason ?? "-"}
                  </p>
                </div>
                <Badge variant={b.consumed ? "secondary" : "outline"}>{TIMING_LABEL[b.paymentTiming]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BonusCreateForm({
  storeId,
  employees,
  defaultEmployeeId,
  onClose,
}: {
  storeId: number;
  employees: { id: number; name: string }[];
  defaultEmployeeId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
  const [bonusDate, setBonusDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [timing, setTiming] = useState<BonusPaymentTiming>("IMMEDIATE_CASH");

  const mutation = useMutation({
    mutationFn: () =>
      createBonus(storeId, {
        employeeId: Number(employeeId),
        bonusDate,
        amount: Number(amount),
        reason: reason || undefined,
        paymentTiming: timing,
      }),
    onSuccess: () => {
      toast.success("보너스를 등록했어요.");
      queryClient.invalidateQueries({ queryKey: ["store", storeId, "bonuses"] });
      onClose();
    },
    onError: (err) => handleMutationError(err, "등록에 실패했어요."),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>보너스 등록</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-2">
          <Label>지급 결정일</Label>
          <Input type="date" value={bonusDate} onChange={(e) => setBonusDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>금액(원)</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>사유(선택)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>지급 방식</Label>
          <NativeSelect
            value={timing}
            onChange={(e) => setTiming(e.target.value as BonusPaymentTiming)}
          >
            <option value="IMMEDIATE_CASH">즉시 현금 지급(이미 지급함)</option>
            <option value="INCLUDED_IN_PAYROLL">다음 급여에 합산 지급</option>
          </NativeSelect>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          disabled={!employeeId || !amount || Number(amount) <= 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          등록
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
