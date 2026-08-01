import { NextRequest, NextResponse } from "next/server";

/**
 * 홈 대시보드 BFF — Next.js Route Handler(02_API_활용계획.md §2 "B" 분류).
 * 매장 상세(오늘출퇴근·이번달매출 포함) + 승인대기 건수를 병렬 fetch 후 단일 payload로 합성한다.
 * 목표(08_개발로드맵.md Phase1 완료기준): P95 응답시간 실측, 초과 시 Spring 집계 엔드포인트 전환 검토.
 *
 * 인증: 이 Route Handler는 서버(Node) 런타임에서 실행되므로 브라우저의 자동 쿠키 첨부 혜택이 없다 —
 * 들어온 요청의 Cookie 헤더를 그대로 백엔드 호출에 전달(forward)해야 세션 인증이 유지된다.
 */

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:7070";

export async function GET(request: NextRequest) {
  const start = performance.now();

  const storeId = parseStoreId(request.nextUrl.searchParams.get("storeId"));
  if (storeId === null) {
    return NextResponse.json({ error: "storeId 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? "";

  async function backendGet(path: string) {
    const res = await fetch(`${BACKEND_INTERNAL_URL}${path}`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`백엔드 호출 실패: ${path} → ${res.status}`);
    }
    return res.json();
  }

  try {
    const [store, approvals] = await Promise.all([
      backendGet(`/api/stores/${storeId}`),
      backendGet(`/api/stores/${storeId}/approval-requests`),
    ]);

    const pendingApprovals = Array.isArray(approvals)
      ? approvals.filter((a: { status?: string }) => a.status === "PENDING").length
      : 0;

    const durationMs = Math.round(performance.now() - start);

    return NextResponse.json(
      {
        store: {
          id: store.id,
          storeName: store.storeName,
          employeeCount: store.employeeCount,
          todayAttendance: store.todayAttendance,
          monthlyRevenue: store.monthlyRevenue,
          monthlyLaborCost: store.monthlyLaborCost,
        },
        pendingApprovals,
        bffDurationMs: durationMs,
      },
      { headers: { "X-BFF-Duration-Ms": String(durationMs) } },
    );
  } catch {
    // 백엔드 경로·상태를 그대로 돌려주면 내부 API 구조를 노출할 수 있으므로 일반 오류만 반환한다.
    return NextResponse.json({ error: "대시보드 정보를 불러오지 못했습니다." }, { status: 502 });
  }
}

function parseStoreId(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
