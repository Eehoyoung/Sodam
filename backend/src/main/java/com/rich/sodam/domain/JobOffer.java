package com.rich.sodam.domain;

import com.rich.sodam.domain.type.JobResponseStatus;
import com.rich.sodam.domain.type.JobWorkType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 채용 제안(JobOffer) — 사장이 구직자에게 보내는 인앱 제안(260711_작업통합.md Part 2 §15.2, V54).
 *
 * <p>수락 시점에만 매장 초대코드가 공개된다(§15.1). 그 발급 자체는 이 엔티티의 책임이 아니라
 * 기존 매장 가입 퍼널({@code JoinStoreByCode})을 호출만 하는 서비스 레이어(Phase 5 서비스)의
 * 책임이다 — 이 엔티티는 상태 전이만 담당한다.</p>
 *
 * <p><b>동시 중복 PENDING 방지(§10 Phase 5 동시성 리스크 1)</b>: "같은 매장→같은 구직자 PENDING 1건"
 * 제약을 서비스의 check-then-insert만으로 막으면 동시 요청 두 건이 모두 조회 단계를 통과해 중복
 * PENDING이 실제로 생성될 수 있다. {@link #pendingDedupKey}는 MySQL {@code GENERATED ALWAYS AS} 생성
 * 컬럼(V54 DDL)이 {@code status='PENDING'}일 때만 {@code "{storeId}_{targetUserId}"} 값을 갖도록 만들고,
 * 그 컬럼에 유니크 인덱스를 걸어 최종 정합성을 DB 레벨에서 보장한다(NULL은 유니크 인덱스에서 여러 개
 * 허용되므로 PENDING이 아닌 행끼리는 충돌하지 않는다). 애플리케이션은 이 필드를 직접 쓰지 않는다
 * (insertable/updatable=false) — 서비스는 여전히 사전 조회로 사용자 친화적 409를 만들되, DB 제약
 * 위반({@code DataIntegrityViolationException})을 잡아 409로 변환하는 이중 방어로 구현해야 한다.</p>
 */
@Entity
@Table(name = "job_offer", indexes = {
        @Index(name = "idx_job_offer_target_status", columnList = "target_user_id, status"),
        @Index(name = "idx_job_offer_store_status", columnList = "store_id, status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_offer_pending", columnNames = "pending_dedup_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 제안 매장. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** 수신 구직자. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    /** SUBSTITUTE(당일 대타) / REGULAR(정기 채용) — 구직자의 seekingTypes에 포함된 유형이어야 발송 가능(서비스 검증). */
    @Enumerated(EnumType.STRING)
    @Column(name = "work_type", nullable = false, length = 20)
    private JobWorkType workType;

    /** 대타면 필수, 정기면 null 허용. */
    @Column(name = "work_date")
    private LocalDate workDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "hourly_wage", nullable = false)
    private Integer hourlyWage;

    @Column(name = "message", length = 200)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private JobResponseStatus status = JobResponseStatus.PENDING;

    /** REGULAR: 생성 +24h. SUBSTITUTE: min(생성 +24h, 근무 시작 시각) — 계산은 서비스 레이어 책임. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * DB 생성 컬럼 — status='PENDING'일 때만 {@code "{storeId}_{targetUserId}"} 값을 갖고,
     * 그 외 상태는 NULL이다. 애플리케이션이 직접 읽거나 쓰지 않는다(참고: 클래스 상단 javadoc).
     */
    @Column(name = "pending_dedup_key", insertable = false, updatable = false,
            columnDefinition = "VARCHAR(40) GENERATED ALWAYS AS "
                    + "(CASE WHEN \"status\" = 'PENDING' THEN CONCAT(\"store_id\", '_', \"target_user_id\") ELSE NULL END)")
    private String pendingDedupKey;

    private JobOffer(Store store, User targetUser, JobWorkType workType, LocalDate workDate,
                      LocalTime startTime, LocalTime endTime, Integer hourlyWage, String message,
                      LocalDateTime expiresAt) {
        this.store = store;
        this.targetUser = targetUser;
        this.workType = workType;
        this.workDate = workDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.hourlyWage = hourlyWage;
        this.message = message;
        this.status = JobResponseStatus.PENDING;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 제안 생성. 만료 시각(§15.2: REGULAR=+24h, SUBSTITUTE=min(+24h, 근무 시작)) 계산은 호출측(서비스)
     * 책임이며 이미 계산된 값을 전달받는다.
     */
    public static JobOffer propose(Store store, User targetUser, JobWorkType workType, LocalDate workDate,
                                    LocalTime startTime, LocalTime endTime, Integer hourlyWage, String message,
                                    LocalDateTime expiresAt) {
        return new JobOffer(store, targetUser, workType, workDate, startTime, endTime, hourlyWage, message, expiresAt);
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

    /** 만료 처리(lazy 판정) — 배치 없이 조회/응답 시점에 서비스가 {@code expiresAt} 경과를 확인해 호출한다. */
    public void expire() {
        this.status = JobResponseStatus.EXPIRED;
    }
}
