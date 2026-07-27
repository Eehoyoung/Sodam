import { toast } from "sonner";
import { ApiError } from "./api";

/**
 * 쓰기 액션 공통 에러 처리 — 409(낙관적 락 충돌)는 별도 안내(재조회 유도),
 * 그 외는 서버 메시지를 그대로 토스트로 보여준다.
 */
export function handleMutationError(err: unknown, fallbackMessage: string) {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      toast.error("다른 곳에서 먼저 수정됐어요", {
        description: "최신 상태로 새로고침한 뒤 다시 시도해 주세요.",
      });
      return;
    }
    toast.error(err.message || fallbackMessage);
    return;
  }
  toast.error(fallbackMessage);
}
