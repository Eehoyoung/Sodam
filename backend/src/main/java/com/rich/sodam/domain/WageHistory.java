package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 시급 변경 이력. 매장 기본 시급 또는 직원별 개별 시급 변경 시 자동 기록.
 * 적용 시작일(effectiveFrom) 기준으로 출퇴근 시 어떤 시급이 적용됐는지 추적 가능.
 */
@Entity
@Table(name = "wage_history", indexes = {
        @Index(name = "idx_wage_history_store", columnList = "store_id, effectiveFrom"),
        @Index(name = "idx_wage_history_employee", columnList = "employee_id, store_id, effectiveFrom")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WageHistory {

    public enum Scope { STORE_DEFAULT, EMPLOYEE_OVERRIDE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wage_history_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Scope scope;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** EMPLOYEE_OVERRIDE 일 때만 not null */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeProfile employee;

    @Column(nullable = false)
    private Integer hourlyWage;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_user_id")
    private User changedBy;

    @Column(length = 200)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static WageHistory storeDefault(Store store, int wage, User by, String reason) {
        WageHistory w = new WageHistory();
        w.scope = Scope.STORE_DEFAULT;
        w.store = store;
        w.hourlyWage = wage;
        w.effectiveFrom = LocalDate.now();
        w.changedBy = by;
        w.reason = reason;
        w.createdAt = LocalDateTime.now();
        return w;
    }

    public static WageHistory employeeOverride(Store store, EmployeeProfile employee, int wage, User by, String reason) {
        WageHistory w = new WageHistory();
        w.scope = Scope.EMPLOYEE_OVERRIDE;
        w.store = store;
        w.employee = employee;
        w.hourlyWage = wage;
        w.effectiveFrom = LocalDate.now();
        w.changedBy = by;
        w.reason = reason;
        w.createdAt = LocalDateTime.now();
        return w;
    }
}
