package com.rich.sodam.domain;

import com.rich.sodam.domain.type.JobCategory;
import com.rich.sodam.domain.type.JobWorkType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 구인 공고(JobPosting) — 사장이 매장당 1건만 유지하는 활성 공고(260711_작업통합.md Part 2 §19.2,
 * v1 단순화 upsert, V55).
 *
 * <p>매장당 1건 제약은 {@code store_id}의 단순 UNIQUE(상태 무관)로 DB 레벨에서 보장한다(§10 Phase 5
 * 동시성 리스크 2 — {@link JobOffer}의 생성 컬럼 트릭과 달리 여기는 상태와 무관하게 항상 1건이므로
 * 생성 컬럼이 불필요하다). "upsert"를 find-then-decide로 구현할 때의 동시 저장 레이스는 이 엔티티가
 * 아니라 서비스 레이어가 {@code SELECT ... FOR UPDATE} 등으로 방어해야 한다.</p>
 */
@Entity
@Table(name = "job_posting", indexes = {
        @Index(name = "idx_job_posting_open", columnList = "open")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 공고 매장 — 매장당 1건(UNIQUE). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false, unique = true)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_type", nullable = false, length = 20)
    private JobWorkType workType;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_category", nullable = false, length = 30)
    private JobCategory jobCategory;

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

    /** 구인중 ON/OFF. */
    @Column(name = "open", nullable = false)
    private boolean open;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    private JobPosting(Store store, JobWorkType workType, JobCategory jobCategory, LocalDate workDate,
                        LocalTime startTime, LocalTime endTime, Integer hourlyWage, String message) {
        this.store = store;
        this.workType = workType;
        this.jobCategory = jobCategory;
        this.workDate = workDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.hourlyWage = hourlyWage;
        this.message = message;
        this.open = true;
        this.createdAt = LocalDateTime.now();
    }

    /** 최초 공고 생성 — 매장당 1건(store_id UNIQUE)이므로 이미 존재하면 서비스가 {@link #update}를 호출해야 한다. */
    public static JobPosting create(Store store, JobWorkType workType, JobCategory jobCategory, LocalDate workDate,
                                     LocalTime startTime, LocalTime endTime, Integer hourlyWage, String message) {
        return new JobPosting(store, workType, jobCategory, workDate, startTime, endTime, hourlyWage, message);
    }

    /** 공고 upsert의 update 분기 — 내용 전체를 갈아끼운다. open 여부는 {@link #openPosting}/{@link #closePosting} 별도. */
    public void update(JobWorkType workType, JobCategory jobCategory, LocalDate workDate,
                        LocalTime startTime, LocalTime endTime, Integer hourlyWage, String message) {
        this.workType = workType;
        this.jobCategory = jobCategory;
        this.workDate = workDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.hourlyWage = hourlyWage;
        this.message = message;
        touch();
    }

    /** 구인중으로 전환. */
    public void openPosting() {
        this.open = true;
        touch();
    }

    /** 구인 마감 — OFF 전환 시 대기중 지원은 lazy EXPIRED 판정 대상이 된다(서비스 책임, §19.2). */
    public void closePosting() {
        this.open = false;
        touch();
    }

    private void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
