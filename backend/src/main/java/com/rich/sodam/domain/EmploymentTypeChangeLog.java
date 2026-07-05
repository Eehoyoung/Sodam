package com.rich.sodam.domain;

import com.rich.sodam.domain.type.EmploymentType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 고용형태(시급제↔월급제) 전환 이력.
 *
 * <p>전환 시점 증빙용 — 과거 정산분에 새 형태가 소급 적용되지 않았음을 입증한다
 * (임금 산정 방식 변경은 근로계약 변경 사항이므로 분쟁 시 "언제부터 월급제였는지"가 쟁점).
 * 급여 계산은 이 로그를 참조하지 않는다(계산은 관계의 현재 상태 기준 — 소급 재계산 방지는
 * Payroll 확정 상태머신이 담당).</p>
 */
@Entity
@Table(name = "employment_type_change_log", indexes = {
        @Index(name = "idx_etcl_relation", columnList = "relation_id, changed_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmploymentTypeChangeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employment_type_change_log_id")
    private Long id;

    /** 대상 직원-매장 관계 id. */
    @Column(name = "relation_id", nullable = false)
    private Long relationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_type", nullable = false, length = 20)
    private EmploymentType fromType;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_type", nullable = false, length = 20)
    private EmploymentType toType;

    /** 전환 후 월급(원). 월급제 전환·월급 변경 시 스냅샷, 시급제 전환이면 null. */
    @Column(name = "monthly_salary")
    private Integer monthlySalary;

    /**
     * 변경 수행자(사장 userId). API 경로는 항상 principal 을 기록하고,
     * 근로계약서 저장 경유 등 내부 전파로 주체가 명시되지 않으면 null (V37에서 완화).
     */
    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    public static EmploymentTypeChangeLog of(Long relationId, EmploymentType fromType, EmploymentType toType,
                                             Integer monthlySalary, Long changedBy) {
        EmploymentTypeChangeLog log = new EmploymentTypeChangeLog();
        log.relationId = relationId;
        log.fromType = fromType;
        log.toType = toType;
        log.monthlySalary = monthlySalary;
        log.changedBy = changedBy;
        log.changedAt = LocalDateTime.now();
        return log;
    }
}
