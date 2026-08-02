package com.rich.sodam.domain.type;

/**
 * 채팅방 상태(§4.6 보관 정책). 배치 없이 조회/발신 시점에 lazy 판정한다
 * (JobOffer/JobApplication의 EXPIRED lazy 판정과 동일 원칙).
 */
public enum ChatRoomStatus {
    /** 신규 메시지 발신 가능. */
    ACTIVE,
    /** 매칭 거절/만료 후 유예기간 경과 — 신규 발신 차단, 기존 대화는 열람 가능 유지. */
    READ_ONLY
}
