/**
 * 백엔드(Spring Boot, 포트 7070 고정) 베이스 URL.
 * 로컬 개발/도커컴포즈 모두 브라우저가 localhost 로 접근하므로 NEXT_PUBLIC_ 로 노출해도
 * 시크릿 유출이 아니다(공개 API 엔드포인트 주소일 뿐).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7070";
