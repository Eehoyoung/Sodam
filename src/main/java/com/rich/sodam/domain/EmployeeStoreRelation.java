package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
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

    public EmployeeStoreRelation(EmployeeProfile employeeProfile, Store store) {
        this.employeeProfile = employeeProfile;
        this.store = store;
    }

    public EmployeeStoreRelation(EmployeeProfile employeeProfile, Store store, Integer customHourlyWage) {
        this.employeeProfile = employeeProfile;
        this.store = store;
        this.customHourlyWage = customHourlyWage;
        this.useStoreStandardWage = (customHourlyWage == null);
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
}