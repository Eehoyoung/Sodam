package com.rich.sodam.domain.type;

/**
 * 채팅방({@link com.rich.sodam.domain.ChatRoom})의 개설 근거 매칭 종류 — 채용 제안({@code JobOffer},
 * §15) 또는 구인 공고 지원({@code JobApplication}, §19) 중 어느 쪽에서 열렸는지
 * (recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * <p>{@code sourceId}와 조합해 {@code (sourceType, sourceId)} 유니크 제약으로 매칭 1건당 채팅방
 * 1개만 존재하도록 보장한다(V73 DDL).</p>
 */
public enum ChatSourceType {
    /** 사장 → 구직자 채용 제안({@code JobOffer}) — 구직자 수락 시 개설. */
    OFFER,
    /** 구직자 → 매장 지원({@code JobApplication}) — 사장 응답(수락/거절) 시 개설. */
    APPLICATION
}
