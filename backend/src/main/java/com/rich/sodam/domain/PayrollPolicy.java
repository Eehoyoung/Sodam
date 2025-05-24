package com.rich.sodam.domain;

import com.rich.sodam.domain.type.TaxPolicyType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "payroll_policy")
@Getter
@Setter
@NoArgsConstructor
public class PayrollPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "store_id")
    private Store store;

    // 세금 정책 유형 (3.3% 원천징수 또는 4대보험)
    @Enumerated(EnumType.STRING)
    private TaxPolicyType taxPolicyType;

    // 야간근무 가산율 (기본값 1.5 = 150%)
    private Double nightWorkRate = 1.5;

    // 야간근무 시작 시간 (기본값 22시)
    private LocalTime nightWorkStartTime = LocalTime.of(22, 0);

    // 초과근무 가산율 (기본값 1.5 = 150%)
    private Double overtimeRate = 1.5;

    // 일일 기본 근무 시간 (시간제 초과근무 계산용, 기본값 8시간)
    private Double regularHoursPerDay = 8.0;

    // 주휴수당 지급 여부
    private Boolean weeklyAllowanceEnabled = true;

    // 생성일/수정일
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}