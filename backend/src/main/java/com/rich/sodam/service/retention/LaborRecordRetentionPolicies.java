package com.rich.sodam.service.retention;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.LaborContractRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;

/**
 * 근로관계 기록(출퇴근·근로계약)의 3년 보존정책 — 260807 마스터 실행계획서 WP-J.
 *
 * <p>개인정보처리방침 제4조는 "출퇴근·급여·근로 기록: 3년간 보관 후 파기 / 근거: 근로기준법 제42조"를
 * <b>이미 공개 게시</b>했으나, 정작 이 테이블들에 대한 {@link RetentionPolicy} 빈이 없어 방침이 약속한
 * 파기가 실행되지 않고 있었다(2026-08-07 법무·노무 리뷰어가 각각 독립적으로 지적, 두 결과가 일치).
 * 이 클래스가 그 공백을 메운다.</p>
 *
 * <h3>기산점을 "근로관계 종료일"로 잡은 이유</h3>
 * <p>현행 방침 문구는 "발생일로부터 3년"이지만, 근로기준법 시행령 §22는 계약 서류의 보존기간을
 * <b>근로관계가 끝난 날</b>부터 센다. 발생일 기준으로 구현하면 재직 5년 차 직원의 1년 차 출퇴근 기록이
 * <b>퇴직 전에 먼저 파기</b>되어, §42가 요구하는 최소 보존을 오히려 위반하게 된다.
 * 따라서 종료일 기산을 채택했다 — 어느 해석을 따르든 <b>부족하게 지우는 쪽</b>이라 안전하다
 * (종료일 ≥ 발생일이므로 발생일 기준 3년 요구도 항상 충족한다).</p>
 *
 * <p>⛔ 이 기산점 판단은 <b>노무사 서면확인 대기 중</b>이다(CLAUDE.md 출시 전 점검항목 6번, 게이트 G-6).
 * 확인 결과에 따라 방침 문구("발생일")를 시행령에 맞게 고치거나 이 구현을 조정한다.</p>
 *
 * <h3>안전장치</h3>
 * <ul>
 *   <li><b>실제 파기는 기본 비활성</b> — {@link RetentionNoticeScheduler}가
 *       {@code sodam.retention.purge.execute-enabled=true} 없이는 {@code executePurge()}를 호출하지 않는다.
 *       이 빈이 하는 일은 만료 대상을 {@code retention_purge_schedule}에 <b>기록</b>하는 것까지이며,
 *       그 자체로는 원본 데이터를 건드리지 않는다(되돌릴 수 있는 작업).</li>
 *   <li><b>{@code noticeRequired() = true}</b> — 데이터 주체(근로자)가 명확하므로 30/15/1일 전 사전 고지 대상이다.
 *       임금채권·퇴직급여 청구권 소멸시효가 보존기간과 똑같이 3년이라, 시효 만료 직전에 증거가 먼저
 *       사라지지 않도록 고지와 다운로드 제공이 특히 중요하다(법무·노무 공통 권고).</li>
 *   <li><b>배치 상한</b> — 출퇴근은 로우 수가 매우 많아(부하테스트 기준 매장 1,000·직원 2만·24개월)
 *       한 번의 스캔이 전부를 훑지 않도록 {@code scan-batch-size}로 제한한다. 남은 대상은 다음 날 스캔이 이어받는다.</li>
 * </ul>
 */
abstract class AbstractLaborRecordRetentionPolicy implements RetentionPolicy {

    /** 근로기준법 §42 — 계약 서류 3년 보존. */
    private static final Period LABOR_RECORD_RETENTION = Period.ofYears(3);

    private final int scanBatchSize;
    private final BiFunction<LocalDateTime, PageRequest, List<Object[]>> finder;

    AbstractLaborRecordRetentionPolicy(int scanBatchSize,
                                       BiFunction<LocalDateTime, PageRequest, List<Object[]>> finder) {
        this.scanBatchSize = scanBatchSize;
        this.finder = finder;
    }

    @Override
    public Period retentionPeriod() {
        return LABOR_RECORD_RETENTION;
    }

    /** 근로자가 데이터 주체로 특정되므로 30/15/1일 전 사전 고지 대상이다. */
    @Override
    public boolean noticeRequired() {
        return true;
    }

    @Override
    public List<ExpiredEntity> findExpired(LocalDateTime cutoff) {
        return finder.apply(cutoff, PageRequest.of(0, scanBatchSize)).stream()
                .map(row -> new ExpiredEntity((Long) row[0], (LocalDateTime) row[1]))
                .toList();
    }
}

/**
 * 출퇴근 기록 3년 보존. 기산점은 근로관계 종료일.
 */
@Component
class AttendanceRetentionPolicy extends AbstractLaborRecordRetentionPolicy {

    private final AttendanceRepository attendanceRepository;

    AttendanceRetentionPolicy(AttendanceRepository attendanceRepository,
                              @Value("${sodam.retention.labor.scan-batch-size:1000}") int scanBatchSize) {
        super(scanBatchSize, attendanceRepository::findExpiredAfterEmploymentEnded);
        this.attendanceRepository = attendanceRepository;
    }

    @Override
    public String tableName() {
        return "attendance";
    }

    @Override
    public String displayName() {
        return "출퇴근 기록";
    }

    /** {@code EmployeeProfile}은 {@code User}와 PK를 공유(@MapsId)하므로 프로필 id가 곧 user id다. */
    @Override
    public Optional<Long> dataSubjectUserId(Long entityId) {
        return attendanceRepository.findById(entityId)
                .map(a -> a.getEmployeeProfile().getId());
    }

    @Override
    public void purge(Long entityId) {
        attendanceRepository.deleteById(entityId);
    }
}

/**
 * 근로계약 3년 보존. 기산점은 근로관계 종료일.
 */
@Component
class LaborContractRetentionPolicy extends AbstractLaborRecordRetentionPolicy {

    private final LaborContractRepository laborContractRepository;

    LaborContractRetentionPolicy(LaborContractRepository laborContractRepository,
                                 @Value("${sodam.retention.labor.scan-batch-size:1000}") int scanBatchSize) {
        super(scanBatchSize, laborContractRepository::findExpiredAfterEmploymentEnded);
        this.laborContractRepository = laborContractRepository;
    }

    @Override
    public String tableName() {
        return "labor_contract";
    }

    @Override
    public String displayName() {
        return "근로계약서";
    }

    /** {@code LaborContract.employeeId}는 {@code EmployeeProfile} id이고, 이는 곧 user id다(@MapsId). */
    @Override
    public Optional<Long> dataSubjectUserId(Long entityId) {
        return laborContractRepository.findById(entityId)
                .map(LaborContract::getEmployeeId);
    }

    @Override
    public void purge(Long entityId) {
        laborContractRepository.deleteById(entityId);
    }
}
