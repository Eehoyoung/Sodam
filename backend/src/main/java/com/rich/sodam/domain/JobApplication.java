package com.rich.sodam.domain;

import com.rich.sodam.domain.type.JobResponseStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 구인 공고 지원(JobApplication) — 직원이 {@link JobPosting}에 지원하는 건
 * (260711_작업통합.md Part 2 §19.2, V55). {@link JobOffer}(§15, 사장→직원)의 역방향이다.
 *
 * <p>지원 자격(출퇴근 이력 게이트)·수락 시 초대코드 공개는 이 엔티티의 책임이 아니라 서비스 레이어
 * 책임이다 — 이 엔티티는 상태 전이만 담당한다.</p>
 *
 * <p><b>동시 중복 PENDING 방지</b>: {@link JobOffer}와 동일 패턴. {@link #pendingDedupKey} DB 생성
 * 컬럼(V55 DDL, {@code status='PENDING'}일 때만 {@code "{postingId}_{applicantUserId}"} 값)에 유니크
 * 인덱스를 걸어 "같은 공고→같은 지원자 PENDING 1건"을 DB 레벨에서 보장한다(§10 Phase 5 동시성 리스크
 * 3). 애플리케이션은 이 필드를 직접 쓰지 않는다.</p>
 */
@Entity
@Table(name = "job_application", indexes = {
        @Index(name = "idx_job_application_posting_status", columnList = "posting_id, status"),
        @Index(name = "idx_job_application_applicant_status", columnList = "applicant_user_id, status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_application_pending", columnNames = "pending_dedup_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posting_id", nullable = false)
    private JobPosting posting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_user_id", nullable = false)
    private User applicantUser;

    @Column(name = "message", length = 200)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private JobResponseStatus status = JobResponseStatus.PENDING;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * DB 생성 컬럼 — status='PENDING'일 때만 {@code "{postingId}_{applicantUserId}"} 값을 갖고,
     * 그 외 상태는 NULL이다. 애플리케이션이 직접 읽거나 쓰지 않는다(참고: 클래스 상단 javadoc).
     */
    @Column(name = "pending_dedup_key", insertable = false, updatable = false,
            columnDefinition = "VARCHAR(40) GENERATED ALWAYS AS "
                    + "(CASE WHEN \"status\" = 'PENDING' THEN CONCAT(\"posting_id\", '_', \"applicant_user_id\") ELSE NULL END)")
    private String pendingDedupKey;

    private JobApplication(JobPosting posting, User applicantUser, String message) {
        this.posting = posting;
        this.applicantUser = applicantUser;
        this.message = message;
        this.status = JobResponseStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    /** 지원 생성 — 자격(출퇴근 이력) 검증은 서비스 레이어 책임. */
    public static JobApplication apply(JobPosting posting, User applicantUser, String message) {
        return new JobApplication(posting, applicantUser, message);
    }

    public boolean isPending() {
        return this.status == JobResponseStatus.PENDING;
    }

    /** 수락 — PENDING 상태 검증(재응답 409 판정)은 서비스 레이어 책임. */
    public void accept() {
        this.status = JobResponseStatus.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
    }

    /** 거절. */
    public void decline() {
        this.status = JobResponseStatus.DECLINED;
        this.respondedAt = LocalDateTime.now();
    }

    /** 만료 처리(lazy 판정) — 공고 OFF/조건 변경 시 조회 시점에 서비스가 호출한다(§19.2). */
    public void expire() {
        this.status = JobResponseStatus.EXPIRED;
    }
}
