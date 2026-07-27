import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 다이얼로그 안에서 쓰는 드롭다운 전용 — 브라우저 네이티브 &lt;select&gt;.
 *
 * base-ui의 Select(Portal 기반 플로팅 팝업)를 Dialog 안에 중첩하면 옵션을 클릭해도 값이 커밋되지
 * 않고 오히려 다이얼로그 전체가 닫혀버리는 결함을 실측으로 확인했다(2026-07-26, Phase 4 매니저
 * 임명 다이얼로그 검증 중 발견 — 기존 Phase 3 보너스 등록 다이얼로그에도 동일하게 존재하던 결함).
 * base-ui Select의 dismiss 로직이 중첩된 플로팅 트리를 인식하지 못해, Select 팝업의 옵션 클릭이
 * Dialog엔 "바깥 클릭"으로 해석되는 것으로 보인다. 네이티브 select는 브라우저 자체 드롭다운(별도
 * DOM 플로팅 팝업이 아님)이라 이 충돌 자체가 성립하지 않는다 — 다이얼로그 안의 드롭다운은 항상
 * 이 컴포넌트를 쓸 것(페이지 레벨 드롭다운은 기존 Select 컴포넌트 그대로 사용 가능).
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { NativeSelect }
