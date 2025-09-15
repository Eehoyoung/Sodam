package com.rich.sodam.domain;

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
}
