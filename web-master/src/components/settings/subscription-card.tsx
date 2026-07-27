"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  fetchMySubscription,
  fetchPlanCatalog,
  subscribeFree,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { handleMutationError } from "@/lib/mutation-error";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  PENDING_PAYMENT: "결제 대기",
  ACTIVE: "이용중",
  PAST_DUE: "결제 실패(재시도중)",
  PAUSED: "일시정지",
  CANCELLED: "해지됨(만료 예정)",
  EXPIRED: "만료됨",
};

/**
 * 구독/플랜 조회 화면(Phase 4-d). 유료 플랜 신규 결제(Toss Web SDK, authKey 발급)는 계약 확인
 * 전까지 착수 금지라 이 화면에 배선하지 않았다 — 결제 자체는 모바일 앱 안내로 대체.
 * 무료 플랜 전환·해지·일시정지/재개는 카드 정보가 필요 없는 상태 전이라 안전하게 포함했다.
 */
export function SubscriptionCard() {
  const queryClient = useQueryClient();
  const subQueryKey = ["billing", "me"];

  const { data: subscription, isLoading } = useQuery({
    queryKey: subQueryKey,
    queryFn: fetchMySubscription,
  });

  const { data: plans } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: fetchPlanCatalog,
  });

  const currentPlan = plans?.find((p) => p.name === subscription?.plan);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: subQueryKey });

  const freeMutation = useMutation({
    mutationFn: subscribeFree,
    onSuccess: () => {
      toast.success("무료 플랜으로 시작했어요.");
      invalidate();
    },
    onError: (err) => handleMutationError(err, "가입에 실패했어요."),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast.success("구독을 해지했어요. 다음 결제일까지는 계속 이용할 수 있어요.");
      invalidate();
    },
    onError: (err) => handleMutationError(err, "해지에 실패했어요."),
  });

  const pauseMutation = useMutation({
    mutationFn: pauseSubscription,
    onSuccess: () => {
      toast.success("구독을 일시정지했어요.");
      invalidate();
    },
    onError: (err) => handleMutationError(err, "일시정지에 실패했어요."),
  });

  const resumeMutation = useMutation({
    mutationFn: resumeSubscription,
    onSuccess: () => {
      toast.success("구독을 재개했어요.");
      invalidate();
    },
    onError: (err) => handleMutationError(err, "재개에 실패했어요."),
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 pt-6">
        {!subscription ? (
          <>
            <p className="text-sm text-muted-foreground">아직 구독중인 플랜이 없습니다.</p>
            <div>
              <Button disabled={freeMutation.isPending} onClick={() => freeMutation.mutate()}>
                무료 플랜으로 시작
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              유료 플랜(STARTER 이상) 결제는 모바일 앱에서 진행해 주세요.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-foreground">{currentPlan?.displayName ?? subscription.plan}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPlan ? `월 ${currentPlan.monthlyPriceKrw.toLocaleString()}원` : ""}
                </p>
              </div>
              <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                {STATUS_LABEL[subscription.status]}
              </Badge>
            </div>

            {subscription.cardLabel && (
              <p className="text-sm text-muted-foreground">결제 수단: {subscription.cardLabel}</p>
            )}
            {subscription.nextBillingAt && (
              <p className="text-sm text-muted-foreground">
                다음 결제일: {new Date(subscription.nextBillingAt).toLocaleDateString("ko-KR")}
              </p>
            )}
            {subscription.currentPeriodEndAt && (
              <p className="text-sm text-muted-foreground">
                이용 만료일: {new Date(subscription.currentPeriodEndAt).toLocaleDateString("ko-KR")}
              </p>
            )}

            <div className="flex gap-2">
              {subscription.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  disabled={pauseMutation.isPending}
                  onClick={() => pauseMutation.mutate()}
                >
                  일시정지
                </Button>
              )}
              {subscription.status === "PAUSED" && (
                <Button disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
                  재개
                </Button>
              )}
              {(subscription.status === "ACTIVE" || subscription.status === "PAUSED") && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="outline" className="text-destructive" />}>
                    해지
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>구독을 해지할까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        해지해도 다음 결제일까지는 계속 이용할 수 있고, 이후 무료 플랜으로 전환됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelMutation.mutate()}>해지</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <p className="text-xs text-muted-foreground">플랜 업그레이드(유료 결제)는 모바일 앱에서 진행해 주세요.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
