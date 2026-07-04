package com.rich.sodam.service;

import com.rich.sodam.config.integration.EmailSender;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TaxReportSendLog;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.TaxReportSendLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 세무사 인건비 내역서 송부 — 확정/지급완료만 포함, 세무사 이메일 필수,
 * 중복 발송 409, 발송 실패도 이력 기록.
 */
@ExtendWith(MockitoExtension.class)
class TaxReportServiceTest {

    private static final LocalDate FROM = LocalDate.of(2026, 6, 1);
    private static final LocalDate TO = LocalDate.of(2026, 6, 30);

    @Mock
    PayrollRepository payrollRepository;
    @Mock
    StoreRepository storeRepository;
    @Mock
    TaxReportSendLogRepository sendLogRepository;
    @Mock
    EmailSender emailSender;
    @InjectMocks
    TaxReportService service;

    private Store mockStore(String accountantEmail) {
        Store store = mock(Store.class);
        lenient().when(store.getTaxAccountantEmail()).thenReturn(accountantEmail);
        lenient().when(store.getStoreName()).thenReturn("소담카페");
        lenient().when(store.getBusinessNumber()).thenReturn("123-45-67890");
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        return store;
    }

    private Payroll payroll(PayrollStatus status, String name, int gross, int tax, int net, Double taxRate) {
        User user = mock(User.class);
        lenient().when(user.getName()).thenReturn(name);
        EmployeeProfile ep = mock(EmployeeProfile.class);
        lenient().when(ep.getUser()).thenReturn(user);
        Payroll p = new Payroll();
        p.setEmployee(ep);
        p.setStatus(status);
        p.setStartDate(FROM);
        p.setEndDate(TO);
        p.setGrossWage(gross);
        p.setTaxAmount(tax);
        p.setNetWage(net);
        p.setTaxRate(taxRate);
        return p;
    }

    @Test
    @DisplayName("확정·지급완료 급여만 신고 대상에 포함된다 (DRAFT/CANCELLED 제외)")
    void filtersReportableStatuses() {
        List<Payroll> all = List.of(
                payroll(PayrollStatus.DRAFT, "초안", 100, 3, 97, 0.033),
                payroll(PayrollStatus.CONFIRMED, "확정", 200, 7, 193, 0.033),
                payroll(PayrollStatus.PAID, "지급", 300, 10, 290, 0.033),
                payroll(PayrollStatus.CANCELLED, "취소", 400, 13, 387, 0.033));
        when(payrollRepository.findByStoreIdAndPeriod(1L, FROM, TO)).thenReturn(all);

        List<Payroll> result = service.getReportablePayrolls(1L, FROM, TO);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Payroll::getGrossWage).containsExactlyInAnyOrder(200, 300);
    }

    @Test
    @DisplayName("세무사 이메일 미등록이면 발송 불가 (TAX_ACCOUNTANT_EMAIL_MISSING)")
    void rejectsWhenNoAccountantEmail() {
        mockStore(null);

        assertThatThrownBy(() -> service.sendToAccountant(10L, 1L, FROM, TO, false))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", "TAX_ACCOUNTANT_EMAIL_MISSING");
        verify(emailSender, never()).sendWithAttachments(anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("같은 정산기간에 성공 발송 이력이 있으면 force 없이 409 (TAX_REPORT_ALREADY_SENT)")
    void rejectsDuplicateWithoutForce() {
        mockStore("cpa@tax.kr");
        when(sendLogRepository.existsByStore_IdAndPeriodStartAndPeriodEndAndStatus(
                1L, FROM, TO, TaxReportSendLog.SendStatus.SENT)).thenReturn(true);

        assertThatThrownBy(() -> service.sendToAccountant(10L, 1L, FROM, TO, false))
                .isInstanceOf(ConflictException.class)
                .hasFieldOrPropertyWithValue("errorCode", "TAX_REPORT_ALREADY_SENT");
        verify(emailSender, never()).sendWithAttachments(anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("확정 급여가 0건이면 발송 불가 (TAX_REPORT_NO_CONFIRMED_PAYROLL)")
    void rejectsWhenNothingToReport() {
        mockStore("cpa@tax.kr");
        List<Payroll> drafts = List.of(payroll(PayrollStatus.DRAFT, "초안", 100, 3, 97, 0.033));
        when(payrollRepository.findByStoreIdAndPeriod(1L, FROM, TO)).thenReturn(drafts);

        assertThatThrownBy(() -> service.sendToAccountant(10L, 1L, FROM, TO, false))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", "TAX_REPORT_NO_CONFIRMED_PAYROLL");
    }

    @Test
    @DisplayName("발송 성공 시 PDF+CSV 2건 첨부, SENT 이력 저장")
    void sendsPdfAndCsvAndLogs() {
        mockStore("cpa@tax.kr");
        List<Payroll> confirmed = List.of(payroll(PayrollStatus.CONFIRMED, "김직원", 2_000_000, 66_000, 1_934_000, 0.033));
        when(payrollRepository.findByStoreIdAndPeriod(1L, FROM, TO)).thenReturn(confirmed);
        when(emailSender.sendWithAttachments(anyString(), anyString(), anyString(), anyList()))
                .thenReturn(EmailSender.SendResult.ok());
        when(sendLogRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        TaxReportSendLog log = service.sendToAccountant(10L, 1L, FROM, TO, false);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<EmailSender.Attachment>> captor = ArgumentCaptor.forClass(List.class);
        verify(emailSender).sendWithAttachments(anyString(), anyString(), anyString(), captor.capture());
        assertThat(captor.getValue()).hasSize(2);
        assertThat(captor.getValue().get(0).filename()).endsWith(".pdf");
        assertThat(captor.getValue().get(1).filename()).endsWith(".csv");
        assertThat(log.getStatus()).isEqualTo(TaxReportSendLog.SendStatus.SENT);
        assertThat(log.getPayrollCount()).isEqualTo(1);
        assertThat(log.getTotalGrossWage()).isEqualTo(2_000_000L);
        assertThat(log.getRecipientEmail()).isEqualTo("cpa@tax.kr");
        assertThat(log.getSentBy()).isEqualTo(10L);
    }

    @Test
    @DisplayName("이메일 발송 실패 시 FAILED 이력을 남기고 예외 (TAX_REPORT_SEND_FAILED)")
    void logsFailureWhenEmailFails() {
        mockStore("cpa@tax.kr");
        List<Payroll> paid = List.of(payroll(PayrollStatus.PAID, "김직원", 1_000_000, 33_000, 967_000, 0.033));
        when(payrollRepository.findByStoreIdAndPeriod(1L, FROM, TO)).thenReturn(paid);
        when(emailSender.sendWithAttachments(anyString(), anyString(), anyString(), anyList()))
                .thenReturn(EmailSender.SendResult.fail("smtp timeout"));

        assertThatThrownBy(() -> service.sendToAccountant(10L, 1L, FROM, TO, false))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", "TAX_REPORT_SEND_FAILED");

        ArgumentCaptor<TaxReportSendLog> captor = ArgumentCaptor.forClass(TaxReportSendLog.class);
        verify(sendLogRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(TaxReportSendLog.SendStatus.FAILED);
        assertThat(captor.getValue().getFailReason()).isEqualTo("smtp timeout");
    }

    @Test
    @DisplayName("CSV: 3.3% 건은 소득세 열, 4대보험 건은 보험 열에 공제가 분리 기재된다")
    void csvSplitsWithholdingAndInsurance() {
        Payroll withholding = payroll(PayrollStatus.CONFIRMED, "삼쩜삼", 1_000_000, 33_000, 967_000, 0.033);
        Payroll insured = payroll(PayrollStatus.CONFIRMED, "사대보험", 2_000_000, 189_000, 1_811_000, null);
        insured.setNationalPensionDeduction(90_000);
        insured.setHealthInsuranceDeduction(70_000);
        insured.setLongTermCareDeduction(9_000);
        insured.setEmploymentInsuranceDeduction(20_000);
        when(payrollRepository.findByStoreIdAndPeriod(1L, FROM, TO))
                .thenReturn(List.of(withholding, insured));

        String csv = new String(service.generateLaborCostCsv(1L, FROM, TO), StandardCharsets.UTF_8);
        String[] lines = csv.split("\n");

        assertThat(lines).hasSize(3); // 헤더 + 2건
        // 3.3% 건: 보험 열 0, 소득세 열 33000
        assertThat(lines[1]).contains("삼쩜삼").contains(",0,0,0,0,33000,33000,");
        // 4대보험 건: 보험 열 각각, 소득세 열 0
        assertThat(lines[2]).contains("사대보험").contains(",90000,70000,9000,20000,0,189000,");
    }
}
