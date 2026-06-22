package com.rich.sodam.domain;

import com.rich.sodam.domain.type.WagePaymentMethod;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 근로계약서 (근로기준법 §17 — 서면 명시·교부 의무).
 *
 * <p>§17 필수 기재사항을 구조화해 보관한다:
 * <ol>
 *   <li>임금(구성항목·계산방법·지급방법) — {@link #hourlyWage}, {@link #wagePaymentDay}</li>
 *   <li>소정근로시간 — {@link #contractedHoursPerWeek}</li>
 *   <li>휴일(§55) — {@link #weeklyHolidayDay}</li>
 *   <li>연차유급휴가(§60) — {@link #annualLeaveNote}</li>
 *   <li>취업의 장소·종사 업무 — {@link #workLocation}, {@link #jobDescription}</li>
 * </ol>
 * 계약 본문 법률 문구가 아닌 합의된 근로조건(사장-직원 간) 데이터이므로 시스템이 보관·교부할 수 있다.</p>
 */
@Entity
@Table(name = "labor_contract",
        indexes = @Index(name = "idx_labor_contract_emp_store", columnList = "employee_id, store_id"))
@Getter
@Setter
@NoArgsConstructor
public class LaborContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "labor_contract_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** 계약 시작일 / 종료일(기간제는 종료일, 정함이 없으면 null). */
    private LocalDate startDate;
    private LocalDate endDate;

    /** 임금: 시급(원). 계산방법·지급방법은 아래 항목과 함께 명시. */
    @Column(name = "hourly_wage")
    private Integer hourlyWage;

    /** 임금 지급일(매월 N일). */
    @Column(name = "wage_payment_day")
    private Integer wagePaymentDay;

    /**
     * 임금 지급방법(§17① — 계좌이체/현금). 미지정 시 null(레거시 계약 호환).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "wage_payment_method", length = 20)
    private WagePaymentMethod wagePaymentMethod;

    /**
     * 임금 구성항목·계산방법 명시(§17① — 기본급·수당 등 구성 분해/메모).
     * PII 아님(개인 식별정보 미포함). 예: "기본급 시급 + 주휴수당, 연장 시 가산 1.5배".
     */
    @Column(name = "wage_components", length = 1000)
    private String wageComponents;

    /** 소정근로시간(주). */
    @Column(name = "contracted_hours_per_week")
    private Double contractedHoursPerWeek;

    /**
     * 1주 소정근로일 수(약정 근무일). 주휴수당 개근 판정의 분모(근로기준법 §55 시행령 §30).
     * 설정 시 직원-매장 관계에 전달되어 결근까지 정확 판정(폴백 과지급 방지).
     */
    @Column(name = "contracted_weekly_days")
    private Integer contractedWeeklyDays;

    /** 주휴일 요일(예: SUNDAY). */
    @Column(name = "weekly_holiday_day", length = 16)
    private String weeklyHolidayDay;

    /** 연차유급휴가 안내(§60 적용 여부·산정 기준). */
    @Column(name = "annual_leave_note", length = 500)
    private String annualLeaveNote;

    /** 취업 장소. */
    @Column(name = "work_location", length = 255)
    private String workLocation;

    /** 종사 업무. */
    @Column(name = "job_description", length = 500)
    private String jobDescription;

    /** 직원 서명(동의) 일시 — 교부·동의 입증. */
    @Column(name = "employee_signed_at")
    private LocalDateTime employeeSignedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * 직원 서명(동의) 처리. 멱등 — 이미 서명된 경우 최초 서명 시각을 보존한다.
     *
     * @return 이번 호출로 서명이 새로 기록되면 true, 이미 서명돼 있었으면 false
     */
    public boolean markSigned(LocalDateTime signedAt) {
        if (this.employeeSignedAt != null) {
            return false;
        }
        this.employeeSignedAt = signedAt;
        return true;
    }

    public boolean isSigned() {
        return this.employeeSignedAt != null;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
