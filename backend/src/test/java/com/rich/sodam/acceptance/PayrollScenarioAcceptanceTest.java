package com.rich.sodam.acceptance;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.*;
import com.rich.sodam.service.PayrollService;
import com.rich.sodam.service.StoreManagementServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 인수 테스트 (Acceptance) — 핵심 사용자 시나리오를 실제 서비스로 검증.
 *
 * 시나리오: 사장/매장 준비 → 직원 할당(시급) → 출퇴근 → 급여 계산 → 명세서(PDF).
 * 수용 기준: ① 최저임금 미달 차단(L-3) ② 급여 계산 정확성 ③ 명세서 생성.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollScenarioAcceptanceTest {

    @Autowired private StoreManagementServiceImpl storeManagementService;
    @Autowired private PayrollService payrollService;
    @Autowired private com.rich.sodam.service.PayrollPolicyService payrollPolicyService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private AttendanceRepository attendanceRepository;

    private Store store() {
        Store s = new Store("인수테스트매장", "5550001111", "02-555-0000", "카페", 12000, 100);
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        return storeRepository.save(s);
    }

    private User employee(String email) {
        User u = new User(email, "인수직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepository.save(u);
    }

    @Test
    @DisplayName("수용기준 ①: 2026 최저임금(10,320원) 미만 시급 할당은 차단된다(L-3)")
    void rejectsBelowMinimumWage() {
        Store store = store();
        User emp = employee("accept_low@example.com");

        assertThatThrownBy(() ->
                storeManagementService.assignUserToStoreAsEmployee(emp.getId(), store.getId(), 9_000))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("수용기준 ②③: 직원 할당→8h 출퇴근→급여계산 정확성→명세서 PDF 생성")
    void fullPayrollFlow() {
        Store store = store();
        User emp = employee("accept_ok@example.com");

        // 직원 할당 (시급 15,000 — 최저임금 이상)
        storeManagementService.assignUserToStoreAsEmployee(emp.getId(), store.getId(), 15_000);
        EmployeeProfile profile = employeeProfileRepository.findById(emp.getId()).orElseThrow();
        EmployeeStoreRelation rel = relationRepository.findByEmployeeProfileAndStore(profile, store).orElseThrow();
        assertThat(rel.getAppliedHourlyWage()).isEqualTo(15_000);

        // 8시간 출퇴근 기록
        Attendance att = new Attendance(profile, store);
        LocalDateTime out = LocalDateTime.now();
        att.manualCheckIn(out.minusHours(8), 37.5665, 126.9780, rel.getAppliedHourlyWage());
        att.manualCheckOut(out, 37.5665, 126.9780);
        attendanceRepository.save(att);

        // 급여 정책 준비(기본: 3.3% 원천징수, 8h 소정, 주휴 활성)
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        // 급여 계산
        Payroll payroll = payrollService.calculatePayroll(
                emp.getId(), store.getId(),
                out.toLocalDate().minusDays(1), out.toLocalDate().plusDays(1));

        // 정확성: 휴게 1h 공제 후 7h 정상근로 × 15,000 = 105,000 (기본급), 총액 > 0, 실수령 ≤ 총액
        assertThat(payroll).isNotNull();
        assertThat(payroll.getRegularWage()).isEqualTo(105_000); // 7h × 15,000 (8h 근무 - 휴게 1h)
        assertThat(payroll.getGrossWage()).isGreaterThanOrEqualTo(payroll.getRegularWage());
        assertThat(payroll.getNetWage()).isLessThanOrEqualTo(payroll.getGrossWage());

        // 명세서 PDF 생성
        byte[] pdf = payrollService.generatePayrollPdf(payroll.getId());
        assertThat(pdf).isNotNull().isNotEmpty();
    }
}
