"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateStorePayroll, confirmPayrollWizard, type PayrollRecord } from "@/lib/payroll";
import { handleMutationError } from "@/lib/mutation-error";

type Step = "period" | "review" | "confirm" | "done";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: number;
  onDone: () => void;
}

/**
 * 급여 정산 마법사 3단계 — 대상선정(기간) → 계산확인(매장 일괄 계산 미리보기) → 발급(step-up 재인증 후 확정).
 * 발급은 POST /api/web/payroll/wizard/confirm 로 대상 급여 전체를 한 번에 보내 백엔드 단일
 * 트랜잭션으로 확정한다(하나라도 실패하면 전체 롤백 — 부분 성공 상태를 사용자에게 보여주지 않는다,
 * 02_API_활용계획.md §6). 마법사를 열 때마다 새 Idempotency-Key를 발급해, 같은 발급 시도 안에서
 * 네트워크 재시도가 일어나도 중복 확정되지 않게 한다(05_동시성제어_및_고급아키텍처.md §3).
 */
export function PayrollWizardDialog({ open, onOpenChange, storeId, onDone }: Props) {
  const [step, setStep] = useState<Step>("period");
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [preview, setPreview] = useState<PayrollRecord[]>([]);
  const [password, setPassword] = useState("");
  const [issueResults, setIssueResults] = useState<{ id: number; name: string }[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  function reset() {
    setStep("period");
    setPreview([]);
    setPassword("");
    setIssueResults([]);
    setIdempotencyKey(crypto.randomUUID());
  }

  const calculateMutation = useMutation({
    mutationFn: () => calculateStorePayroll(storeId, startDate, endDate),
    onSuccess: (data) => {
      setPreview(data);
      setStep("review");
    },
    onError: (err) => handleMutationError(err, "계산에 실패했어요."),
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const eligible = preview.filter((p) => p.status === "DRAFT" || p.status === "CONFIRMED");
      const result = await confirmPayrollWizard(
        storeId,
        eligible.map((p) => p.id),
        password,
        idempotencyKey,
      );
      return result.issued.map((p) => ({ id: p.id, name: p.employeeName }));
    },
    onSuccess: (results) => {
      setIssueResults(results);
      setStep("done");
      toast.success(`급여 ${results.length}건을 발급했어요.`);
      onDone();
    },
    onError: (err) => handleMutationError(err, "발급 중 오류가 발생했어요."),
  });

  const totalNet = preview.reduce((sum, p) => sum + p.netWage, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            급여 정산{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({step === "period" ? "1/3 기간 선택" : step === "review" ? "2/3 계산 확인" : step === "confirm" ? "3/3 발급" : "완료"})
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === "period" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>시작일</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>종료일</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              매장에 소속된 활성 직원 전체를 대상으로 일괄 계산합니다.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button
                disabled={!startDate || !endDate || calculateMutation.isPending}
                onClick={() => calculateMutation.mutate()}
              >
                {calculateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                계산하기
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-4">
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">해당 기간에 계산할 대상이 없습니다.</p>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>직원</TableHead>
                        <TableHead>총 근무시간</TableHead>
                        <TableHead>실수령액</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.employeeName}</TableCell>
                          <TableCell className="text-muted-foreground">{p.totalHours.toFixed(1)}시간</TableCell>
                          <TableCell>{p.netWage.toLocaleString()}원</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm font-medium text-foreground">
                  합계: {totalNet.toLocaleString()}원 ({preview.length}명)
                </p>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("period")}>
                이전
              </Button>
              <Button disabled={preview.length === 0} onClick={() => setStep("confirm")}>
                다음
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-lg bg-[var(--brand-amber-soft)] p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--brand-amber)]" />
              <p>
                {preview.length}명, 총 {totalNet.toLocaleString()}원을 확정·지급 처리합니다. 발급 후에는 되돌릴 수
                없으니 본인 확인을 위해 비밀번호를 입력해 주세요.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>비밀번호</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("review")}>
                이전
              </Button>
              <Button
                variant="destructive"
                disabled={!password || issueMutation.isPending}
                onClick={() => issueMutation.mutate()}
              >
                {issueMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                발급 확정
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {issueResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{r.name}</span>
                  <Badge className="gap-1">
                    <Check className="size-3" />
                    발급완료
                  </Badge>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
              >
                닫기
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
