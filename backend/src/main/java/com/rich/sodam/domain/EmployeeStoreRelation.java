package com.rich.sodam.domain;

import com.rich.sodam.domain.type.EmploymentType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 왜 EmployeeStoreRelation에 입사일을 저장해야 하는가?
 * 1. 매장별 입사일: 직원이 여러 매장에서 일할 수 있으며, 각 매장마다 입사일이 다를 수 있습니다.
 * 2. 주휴수당 계산의 정확성: 주휴수당은 매장별 근무시간을 기준으로 계산되므로, 매장별 입사일을 기준으로 주휴수당 계산 주기를 설정하는 것이 더 정확합니다.
 * 3. 데이터 모델 정합성: 직원-매장 관계는 M:N 관계이며, 각 관계마다 고유한 속성(시급, 입사일 등)이 있을 수 있습니다. 이런 속성은 관계 엔티티에 저장하는 것이 데이터 모델링 관점에서 적합합니다.
 * 4. 유연성: 향후 매장별로 다른 급여 정책(예: 근속 기간에 따른 시급 인상)을 적용할 때 매장별 입사일이 필요할 수 있습니다.
 */
@Entity
@Table(name = "employee_store_relation", indexes = {
        @Index(name = "idx_employee_store", columnList = "employee_id, store_id"),
        @Index(name = "idx_employee_id", columnList = "employee_id"),
        @Index(name = "idx_store_id", columnList = "store_id"),
        @Index(name = "idx_hire_date", columnList = "hireDate"),
        @Index(name = "idx_wage_settings", columnList = "useStoreStandardWage, customHourlyWage")
})
@Getter
@Setter
@NoArgsConstructor
public class EmployeeStoreRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeProfile employeeProfile;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    // 개별 사원의 시급 (null일 경우 매장 기준 시급 사용)
    private Integer customHourlyWage;

    // 매장 기준 시급 사용 여부 (기본값 true)
    private Boolean useStoreStandardWage = true;

    // 입사일 설정 메서드 추가
    // 입사일 필드 추가
    private LocalDate hireDate;

    // 직원-매장 관계의 활성 상태 (퇴사/비활성화 처리 시 false)
    @Column(nullable = false)
    private Boolean isActive = true;

    /** 사장만 보이는 직원 메모 (직원에게 절대 노출 X — DTO 분리 필수) */
    @Column(name = "owner_memo", length = 500)
    private String ownerMemo;

    /**
     * 1주 소정근로일 수(약정 근무일). 주휴수당 개근 판정의 분모.
     * null 이면 미설정 — 주휴 산정 시 "출근≥1=개근" 폴백(과지급 방향). 설정 시 결근까지 정확 판정.
     * (근로기준법 §55 시행령 §30: 1주 소정근로일 개근 시 주휴 발생)
     */
    @Column(name = "contracted_weekly_days")
    private Integer contractedWeeklyDays;

    /**
     * 고용(임금) 형태. 기본 HOURLY(시급제) — 기존 데이터·계산 경로와 하위호환.
     * MONTHLY_SALARY(월급제)면 {@link #monthlySalary} 필수이며 급여 계산이 월급제 경로로 분기한다.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 20)
    private EmploymentType employmentType = EmploymentType.HOURLY;

    /** 월급(원, 세전 고정급). MONTHLY_SALARY 전용 — HOURLY 에서는 null 유지. */
    @Column(name = "monthly_salary")
    private Integer monthlySalary;

    /**
     * 개인별 4대보험 가입 여부 — 매장 정책({@code PayrollPolicy.taxPolicyType})의 개인 오버라이드.
     * <ul>
     *   <li>null = 매장 정책 따름 (기존 동작 그대로 — 회귀 없음)</li>
     *   <li>true = 4대보험 근로자 부담분 공제</li>
     *   <li>false = 3.3% 사업소득 원천징수</li>
     * </ul>
     */
    @Column(name = "social_insurance_enrolled")
    private Boolean socialInsuranceEnrolled;

    public EmployeeStoreRelation(EmployeeProfile employeeProfile, Store store) {
        this.employeeProfile = employeeProfile;
        this.store = store;
        this.hireDate = LocalDate.now(); // 현재 날짜를 기본 입사일로 설정
    }

    public EmployeeStoreRelation(EmployeeProfile employeeProfile, Store store, Integer customHourlyWage) {
        this.employeeProfile = employeeProfile;
        this.store = store;
        this.customHourlyWage = customHourlyWage;
        this.useStoreStandardWage = (customHourlyWage == null);
        this.hireDate = LocalDate.now(); // 현재 날짜를 기본 입사일로 설정
    }

    // 실제 적용되는 시급 계산
    public int getAppliedHourlyWage() {
        if (useStoreStandardWage || customHourlyWage == null) {
            return store.getStoreStandardHourWage();
        }
        return customHourlyWage;
    }

    // 개별 시급 설정
    public void setCustomHourlyWage(Integer customHourlyWage) {
        this.customHourlyWage = customHourlyWage;
        this.useStoreStandardWage = (customHourlyWage == null);
    }

    // 매장 기준 시급 사용으로 변경
    public void useStoreStandardWage() {
        this.useStoreStandardWage = true;
    }

    // 개별 시급 사용으로 변경
    public void useCustomWage() {
        if (this.customHourlyWage != null) {
            this.useStoreStandardWage = false;
        }
    }

    public Integer calculateAppliedWage() {
        return useStoreStandardWage ? store.getStoreStandardHourWage() : customHourlyWage;
    }

    public void updateWageSettings(Integer customWage, boolean useStoreStandard) {
        this.customHourlyWage = customWage;
        this.useStoreStandardWage = useStoreStandard;
    }

    /** 월급제(월급 설정 완료) 여부. 급여 계산 분기 판정에 사용. */
    public boolean isMonthlySalaried() {
        return employmentType == EmploymentType.MONTHLY_SALARY && monthlySalary != null;
    }
}
