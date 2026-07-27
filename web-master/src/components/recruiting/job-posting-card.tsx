"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchMyPosting,
  upsertMyPosting,
  JOB_CATEGORY_LABEL,
  type JobCategory,
  type JobPostingUpsertInput,
  type JobWorkType,
} from "@/lib/recruiting";
import { handleMutationError } from "@/lib/mutation-error";

const WORK_TYPE_LABEL: Record<JobWorkType, string> = {
  SUBSTITUTE: "당일 대타",
  REGULAR: "정기 채용",
};

const DEFAULT_FORM: JobPostingUpsertInput = {
  workType: "REGULAR",
  jobCategory: "CAFE",
  workDate: null,
  startTime: "09:00",
  endTime: "18:00",
  hourlyWage: 12000,
  message: "",
  open: true,
};

/**
 * 매장당 공고 1건 upsert — 페이지 레벨 인라인 카드(다이얼로그 아님).
 * Select를 Dialog 안에 중첩하면 값이 안 커밋되는 결함([[web-master-select-in-dialog-bug]])이 있어,
 * 이 폼은 처음부터 다이얼로그가 아닌 페이지 인라인 카드로 설계했다(PayrollPolicyCard와 동일 패턴).
 */
export function JobPostingCard({ storeId }: { storeId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["store", storeId, "job-posting"];

  const { data: posting, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchMyPosting(storeId),
  });

  const [form, setForm] = useState<JobPostingUpsertInput>(DEFAULT_FORM);

  useEffect(() => {
    if (posting) {
      setForm({
        workType: posting.workType,
        jobCategory: posting.jobCategory,
        workDate: posting.workDate,
        startTime: posting.startTime.slice(0, 5),
        endTime: posting.endTime.slice(0, 5),
        hourlyWage: posting.hourlyWage,
        message: posting.message ?? "",
        open: posting.open,
      });
    }
  }, [posting]);

  const mutation = useMutation({
    mutationFn: (input: JobPostingUpsertInput) => upsertMyPosting(storeId, input),
    onSuccess: () => {
      toast.success("구인 공고를 저장했어요.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => handleMutationError(err, "저장에 실패했어요."),
  });

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {posting ? "공고 수정" : "신규 공고 등록"}
          </p>
          {posting && <Badge variant={form.open ? "default" : "secondary"}>{form.open ? "구인중" : "마감"}</Badge>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>근무 형태</Label>
            <Select
              value={form.workType}
              onValueChange={(v) => v && setForm({ ...form, workType: v as JobWorkType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="선택">
                  {(value: string | null) => (value ? WORK_TYPE_LABEL[value as JobWorkType] : "선택")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBSTITUTE">당일 대타</SelectItem>
                <SelectItem value="REGULAR">정기 채용</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>업종</Label>
            <Select
              value={form.jobCategory}
              onValueChange={(v) => v && setForm({ ...form, jobCategory: v as JobCategory })}
            >
              <SelectTrigger>
                <SelectValue placeholder="선택">
                  {(value: string | null) => (value ? JOB_CATEGORY_LABEL[value as JobCategory] : "선택")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(JOB_CATEGORY_LABEL) as JobCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {JOB_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.workType === "SUBSTITUTE" && (
            <div className="flex flex-col gap-2">
              <Label>근무 날짜</Label>
              <Input
                type="date"
                value={form.workDate ?? ""}
                onChange={(e) => setForm({ ...form, workDate: e.target.value })}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>시급(원)</Label>
            <Input
              type="number"
              min={1}
              value={form.hourlyWage}
              onChange={(e) => setForm({ ...form, hourlyWage: Number(e.target.value) })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>시작 시간</Label>
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>종료 시간</Label>
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>한줄 소개(선택, 200자 이내)</Label>
          <Textarea
            value={form.message}
            maxLength={200}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="예: 친절하고 성실하신 분 환영해요!"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-3.5"
              checked={form.open}
              onChange={(e) => setForm({ ...form, open: e.target.checked })}
            />
            구인중 (ON이어야 직원 앱에 노출돼요)
          </label>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
            {posting ? "저장" : "공고 등록"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
