import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  phase: string;
  description: string;
}

/**
 * Phase 0 셸 단계에서 아직 구현되지 않은 메뉴의 자리표시자.
 * 사이드바 링크가 404로 떨어지지 않도록 각 라우트에 최소한의 안내 화면을 둔다
 * (docs/260726/08_개발로드맵.md 의 Phase 배정을 그대로 안내).
 */
export function ComingSoon({ icon: Icon, title, phase, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border-border text-center">
        <CardHeader className="items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]">
            <Icon className="size-6" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>{description}</p>
          <p className="font-medium text-foreground">{phase}에서 제공될 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
