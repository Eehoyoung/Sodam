package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * 근무 시프트 템플릿 엔트리 — 요일별 한 직원의 근무(직원 고정).
 * 적용 시 weekStart + 요일 오프셋으로 실제 날짜를 계산해 WorkShift를 생성한다.
 */
@Entity
@Table(name = "shift_template_entry", indexes = {
        @Index(name = "idx_ste_template", columnList = "shift_template_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShiftTemplateEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_template_entry_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_template_id", nullable = false)
    private ShiftTemplate template;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false, length = 10)
    private DayOfWeek dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "memo", length = 200)
    private String memo;

    private ShiftTemplateEntry(Long employeeId, DayOfWeek dayOfWeek,
                               LocalTime startTime, LocalTime endTime, String memo) {
        this.employeeId = employeeId;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
    }

    public static ShiftTemplateEntry create(Long employeeId, DayOfWeek dayOfWeek,
                                            LocalTime startTime, LocalTime endTime, String memo) {
        return new ShiftTemplateEntry(employeeId, dayOfWeek, startTime, endTime, memo);
    }

    void assignTemplate(ShiftTemplate template) {
        this.template = template;
    }
}
