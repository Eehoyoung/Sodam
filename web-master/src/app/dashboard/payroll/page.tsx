"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Download, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
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
import { useStoreContext } from "@/lib/store-context";
import { downloadPayrollPdf, fetchStorePayrolls, type PayrollStatus } from "@/lib/payroll";
import { PayrollWizardDialog } from "@/components/payroll/payroll-wizard-dialog";
import { PayrollPolicyCard } from "@/components/payroll/payroll-policy-card";
import { PayrollBonusCard } from "@/components/payroll/payroll-bonus-card";

const STATUS_LABEL: Record<PayrollStatus, string> = {
  DRAFT: "작성중",
  CONFIRMED: "확정",
  PAID: "지급완료",
  CANCELLED: "취소됨",
};

const STATUS_VARIANT: Record<PayrollStatus, "secondary" | "default" | "outline"> = {
  DRAFT: "outline",
  CONFIRMED: "secondary",
  PAID: "default",
  CANCELLED: "outline",
};

export default function PayrollPage() {
  const { selectedStore } = useStoreContext();
  const [wizardOpen, setWizardOpen] = useState(false);
  const queryClient = useQueryClient();

  const from = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
  const to = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const payrollsQueryKey = ["store", selectedStore?.id, "payrolls", from, to];

  const { data: payrolls, isLoading } = useQuery({
    queryKey: payrollsQueryKey,
    queryFn: () => fetchStorePayrolls(selectedStore!.id, from, to),
    enabled: !!selectedStore,
  });

  const pdfMutation = useMutation({
    mutationFn: (payroll: { id: number; employeeName: string; endDate: string }) =>
      downloadPayrollPdf(payroll.id, `급여명세서_${payroll.employeeName}_${payroll.endDate}.pdf`),
    onError: () => toast.error("PDF 다운로드에 실패했어요."),
  });

  if (!selectedStore) {
    return <p className="text-sm text-muted-foreground">먼저 매장을 선택해 주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">급여</h1>
          <p className="text-sm text-muted-foreground">{selectedStore.storeName}</p>
        </div>
        <Button className="gap-1.5" onClick={() => setWizardOpen(true)}>
          <Sparkles className="size-4" />
          정산 시작
        </Button>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">정산 내역</TabsTrigger>
          <TabsTrigger value="policy">급여 정책</TabsTrigger>
          <TabsTrigger value="bonus">보너스</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="pt-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !payrolls || payrolls.length === 0 ? (
            <p className="text-sm text-muted-foreground">최근 2개월간 정산 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>실수령액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>명세서</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.startDate} ~ {p.endDate}
                    </TableCell>
                    <TableCell>{p.netWage.toLocaleString()}원</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "PAID" || p.status === "CONFIRMED" ? (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          disabled={pdfMutation.isPending}
                          onClick={() => pdfMutation.mutate(p)}
                          title="PDF 다운로드"
                        >
                          {pdfMutation.isPending ? <FileText className="size-3.5" /> : <Download className="size-3.5" />}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="policy" className="pt-4">
          <PayrollPolicyCard storeId={selectedStore.id} />
        </TabsContent>

        <TabsContent value="bonus" className="pt-4">
          <PayrollBonusCard storeId={selectedStore.id} />
        </TabsContent>
      </Tabs>

      <PayrollWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        storeId={selectedStore.id}
        onDone={() => queryClient.invalidateQueries({ queryKey: payrollsQueryKey })}
      />
    </div>
  );
}
