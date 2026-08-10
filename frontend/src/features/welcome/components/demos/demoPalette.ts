/**
 * 온보딩 데모(NFC·급여계산·매장관리) 전용 팔레트.
 *
 * <p>이 세 데모는 v3 디자인 시스템 확정 이전에 만들어진 머티리얼 계열 색을 쓰고 있고, 같은 값
 * 21종을 78곳에 흩어 놓고 있었다. 값을 바꾸면 데모 화면의 인상이 달라지므로 이번 정리에서는
 * <b>값을 그대로 두고 이름만 부여</b>한다 — 나중에 v3 토큰(`theme/tokens.ts`)으로 옮길 때
 * 이 파일 하나만 고치면 되게 하려는 것이다.</p>
 *
 * ⚠️ 새 화면에서 이 팔레트를 쓰지 말 것. 신규 작업은 v3 토큰이 기준이다(`.claude/rules/frontend.md`).
 */
export const demoPalette = {
    /** 성공·완료 상태 (머티리얼 그린) */
    success: '#4CAF50',
    /** 성공 배경(옅은 그린) */
    successSoft: '#E8F5E8',
    /** 진행·주의 (머티리얼 오렌지) */
    accent: '#FF9800',
    /** 강조 포인트 (핑크) */
    highlight: '#FF4081',
    /** 오류·실패 */
    danger: '#F44336',
    /** 비활성·보조 아이콘 */
    muted: '#9E9E9E',

    textPrimary: '#333333',
    textSecondary: '#666666',

    white: '#FFFFFF',
    border: '#E0E0E0',
    /** 카드·패널 배경(중립) */
    surface: '#F8F8F8',
    /** 리스트 배경(약간 더 밝은 중립) */
    surfaceAlt: '#f8f9fa',
    /** 구분 블록 배경 */
    surfaceMuted: '#F0F0F0',
    /** 따뜻한 톤 배경 */
    surfaceWarm: '#F1EEE9',

    shadow: '#000000',
    /** 모달·오버레이 딤 */
    overlay: 'rgba(0, 0, 0, 0.8)',
    /** 어두운 배경 위 반투명 하이라이트 */
    whiteAlpha: 'rgba(255,255,255,0.2)',
} as const;
