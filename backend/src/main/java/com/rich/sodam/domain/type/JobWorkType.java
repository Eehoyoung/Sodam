package com.rich.sodam.domain.type;

/**
 * 채용 제안·구인 공고 근무 형태(260711_작업통합.md Part 2 §2 #9) — {@link com.rich.sodam.domain.JobOffer},
 * {@link com.rich.sodam.domain.JobPosting}이 공유한다. {@link com.rich.sodam.domain.JobSeekingProfile}의
 * {@code seeking_types} CSV 값과 동일한 문자열 어휘(SUBSTITUTE/REGULAR)를 사용한다.
 */
public enum JobWorkType {
    /** 당일 대타. */
    SUBSTITUTE,
    /** 정기 채용. */
    REGULAR
}
