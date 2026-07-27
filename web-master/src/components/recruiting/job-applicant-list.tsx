"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { fetchApplicants, respondToApplicant, type JobResponseStatus } from "@/lib/recruiting";
import { handleMutationError } from "@/lib/mutation-error";

const STATUS_LABEL: Record<JobResponseStatus, string> = {
  PENDING: "대기중",
  ACCEPTED: "수락됨",
  DECLINED: "거절됨",
  EXPIRED: "만료됨",
};

export function JobApplicantList({ storeId }: { storeId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["store", storeId, "job-applications"];

  const { data: applicants, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchApplicants(storeId),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) => respondToApplicant(id, accept),
    onSuccess: (_, { accept }) => {
      toast.success(accept ? "지원을 수락했어요. 초대코드가 지원자에게 전달돼요." : "지원을 거절했어요.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => handleMutationError(err, "처리에 실패했어요."),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!applicants || applicants.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 지원자가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {applicants.map((a) => (
        <Card key={a.applicationId} className="border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{a.applicantName}</p>
                {a.age != null && <span className="text-sm text-muted-foreground">{a.age}세</span>}
                <Badge variant={a.status === "PENDING" ? "outline" : a.status === "ACCEPTED" ? "default" : "secondary"}>
                  {STATUS_LABEL[a.status]}
                </Badge>
              </div>
              {a.currentEmployment && (
                <p className="mt-1 text-xs text-muted-foreground">
                  현재 근무: {a.currentEmployment.storeName} ({a.currentEmployment.hireDate}~)
                </p>
              )}
              {a.message && <p className="mt-1 text-sm text-foreground">{a.message}</p>}
            </div>

            {a.status === "PENDING" && (
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger render={<Button size="sm" variant="outline" className="gap-1 text-destructive" />}>
                    <X className="size-3.5" />
                    거절
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{a.applicantName}의 지원을 거절할까요?</AlertDialogTitle>
                      <AlertDialogDescription>거절 후에는 되돌릴 수 없습니다.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => respondMutation.mutate({ id: a.applicationId, accept: false })}
                      >
                        거절
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger render={<Button size="sm" className="gap-1" />}>
                    <Check className="size-3.5" />
                    수락
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{a.applicantName}의 지원을 수락할까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        수락하면 지원자에게 매장 초대코드가 알림으로 전달됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => respondMutation.mutate({ id: a.applicationId, accept: true })}>
                        수락
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
