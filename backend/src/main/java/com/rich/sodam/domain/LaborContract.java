package com.rich.sodam.domain;

import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.WagePaymentMethod;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 근로계약서 (근로기준법 §17 — 서면 명시·교부 의무).
 *
 * <p>§17 필수 기재사항을 구조화해 보관한다:
 * <ol>
 *   <li>임금(구성항목·계산방법·지급방법) — {@link #hourlyWage}, {@link #wagePaymentMethod}, {@link #wageComponents}, {@link #wagePaymentDay}</li>
 *   <li>소정근로시간 — {@link #contractedHoursPerWeek}, {@link #workStartTime}, {@link #workEndTime}, {@link #breakMinutes}</li>
 *   <li>휴일(§55) — {@link #weeklyHolidayDay} (주 15시간 미만은 §18③ 에 따라 주휴 미적용 — null 강제)</li>
 *   <li>연차유급휴가(§60) — {@link #annualLeaveNote}</li>
 *   <li>취업의 장소·종사 업무 — {@link #workLocation}, {@link #jobDescription}</li>
 * </ol>
 * 추가로 기간제법 §17(단시간근로자 근로일·근로일별 근로시간), §35(수습), §66/§69/§70(연소근로자 안내),
 * 4대보험 적용여부, 전자서명 이미지(교부 증빙)를 보관한다.
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

    /** 계약기간 구분(정함없음/기간제) — §17 명시적 표기용. 기본값 PERMANENT(레거시 호환). */
    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", length = 20, nullable = false)
    private ContractPeriodType periodType = ContractPeriodType.PERMANENT;

    /** 계약 시작일(=근로개시일) / 종료일(기간제는 필수, 정함이 없으면 null). */
    private LocalDate startDate;
    private LocalDate endDate;

    /** 임금: 시급(원). 계산방법·지급방법은 아래 항목과 함께 명시. */
    @Column(name = "hourly_wage")
    private Integer hourlyWage;

    /** 임금 지급일(매월 N일). */
    @Column(name = "wage_payment_day")
    private Integer wagePaymentDay;

    /** 임금 지급방법(§17① — 계좌이체/현금). */
    @Enumerated(EnumType.STRING)
    @Column(name = "wage_payment_method", length = 20)
    private WagePaymentMethod wagePaymentMethod;

    /**
     * 임금 구성항목·계산방법 명시(§17① — 기본급·수당 등 구성 분해/메모).
     * PII 아님(개인 식별정보 미포함). 예: "기본급 시급 + 주휴수당, 연장/야간/휴일 가산 1.5배".
     */
    @Column(name = "wage_components", length = 1000)
    private String wageComponents;

    /** 소정근로시간(주, 시간). */
    @Column(name = "contracted_hours_per_week")
    private Double contractedHoursPerWeek;

    /** 시업 시각(§17① 소정근로시간의 일부). */
    @Column(name = "work_start_time")
    private LocalTime workStartTime;

    /** 종업 시각. */
    @Column(name = "work_end_time")
    private LocalTime workEndTime;

    /** 휴게시간(분). */
    @Column(name = "break_minutes")
    private Integer breakMinutes;

    /**
     * 1주 소정근로일 수(약정 근무일). 주휴수당 개근 판정의 분모(근로기준법 §55 시행령 §30).
     * 설정 시 직원-매장 관계에 전달되어 결근까지 정확 판정(폴백 과지급 방지).
     */
    @Column(name = "contracted_weekly_days")
    private Integer contractedWeeklyDays;

    /**
     * 요일별 근로시간(시간, 단시간근로자 — 기간제 및 단시간근로자 보호법 §17).
     * 균등한 정규 근무자는 비워도 되지만, 요일마다 근무시간이 다른 파트타이머는
     * 반드시 근로일과 근로일별 근로시간을 서면 명시해야 한다. null = 그 요일 근무 없음.
     */
    @Column(name = "mon_hours") private Double monHours;
    @Column(name = "tue_hours") private Double tueHours;
    @Column(name = "wed_hours") private Double wedHours;
    @Column(name = "thu_hours") private Double thuHours;
    @Column(name = "fri_hours") private Double friHours;
    @Column(name = "sat_hours") private Double satHours;
    @Column(name = "sun_hours") private Double sunHours;

    /**
     * 주휴일 요일(예: SUNDAY). 주 소정근로시간이 15시간 미만이면 §18③ 에 따라
     * 주휴가 발생하지 않으므로 저장 시 강제로 null 처리한다(LaborContractService).
     */
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

    /** 수습 적용 여부(§35). */
    @Column(name = "is_probation", nullable = false)
    private boolean probation = false;

    /** 수습기간(개월). probation=true 일 때만 의미. */
    @Column(name = "probation_months")
    private Integer probationMonths;

    /**
     * 수습 중 임금 비율(예: 0.90 = 최저임금의 90%). 1년 이상 계약 + 수습 3개월 이내 +
     * 단순노무 제외 요건 충족 시만 적용 가능(최저임금법 §5②, 시행령 §3).
     */
    @Column(name = "probation_wage_rate")
    private Double probationWageRate;

    /** 고용보험 적용 여부(4대보험). */
    @Column(name = "employment_insurance", nullable = false)
    private boolean employmentInsurance = true;

    /** 산재보험 적용 여부. */
    @Column(name = "industrial_accident_insurance", nullable = false)
    private boolean industrialAccidentInsurance = true;

    /** 국민연금 적용 여부. */
    @Column(name = "national_pension", nullable = false)
    private boolean nationalPension = true;

    /** 건강보험 적용 여부. */
    @Column(name = "health_insurance", nullable = false)
    private boolean healthInsurance = true;

    /** 직원 서명(동의) 일시 — 교부·동의 입증. */
    @Column(name = "employee_signed_at")
    private LocalDateTime employeeSignedAt;

    /**
     * 직원 서명 이미지(base64 PNG, data URI 미포함). 전자서명법상 증빙력 강화 목적.
     * 미제공(동의 버튼 방식) 시 null 허용 — 그 경우 employeeSignedAt 만으로 서명 인정.
     */
    @Lob
    @Column(name = "employee_signature_image")
    private String employeeSignatureImage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * 직원 서명(동의) 처리. 멱등 — 이미 서명된 경우 최초 서명 시각을 보존한다.
     *
     * @return 이번 호출로 서명이 새로 기록되면 true, 이미 서명돼 있었으면 false
     */
    public boolean markSigned(LocalDateTime signedAt, String signatureImage) {
        if (this.employeeSignedAt != null) {
            return false;
        }
        this.employeeSignedAt = signedAt;
        this.employeeSignatureImage = signatureImage;
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
