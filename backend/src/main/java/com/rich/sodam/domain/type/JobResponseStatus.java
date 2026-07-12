package com.rich.sodam.domain.type;

/**
 * 채용 제안({@link com.rich.sodam.domain.JobOffer})·구인 공고 지원({@link com.rich.sodam.domain.JobApplication})
 * 공용 상태머신(260711_작업통합.md Part 2 §15.2·§19.2) — 두 도메인이 동일한 응답 상태 집합을 쓰므로
 * 하나의 enum으로 공유한다.
 */
public enum JobResponseStatus {
    /** 대기중 — 응답 전. */
    PENDING,
    /** 수신자(구직자/사장)가 수락. */
    ACCEPTED,
    /** 수신자가 거절. */
    DECLINED,
    /** 만료 — 배치 없이 조회/응답 시점에 lazy 판정된다(§15.2 expires_at, §19.2 공고 OFF/조건 변경). */
    EXPIRED
}
