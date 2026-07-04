package com.rich.sodam.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.rich.sodam.config.integration.EmailSender;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TaxReportSendLog;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.TaxReportSendLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 세무사 인건비 내역서 생성·송부 (신고 대리용 세전 급여 자료).
 *
 * 세무사가 원천세/4대보험 신고에 쓰는 것은 "세전(gross) 지급총액 + 항목별 공제내역"이므로
 * 확정(CONFIRMED)·지급완료(PAID) 급여만 포함한다 — 작성중(DRAFT)·취소(CANCELLED) 제외.
 * (사장이 급여를 확정하는 행위 자체가 발송 전 승인 게이트 역할)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaxReportService {

    private static final String DISCLAIMER =
            "※ 본 내역서는 소담(SODAM)이 입력된 출퇴근·시급·정책 기반으로 자동 산정한 참고 자료입니다. "
                    + "4대보험·세액은 개략 추정치이며 공단/세무 신고가 최종입니다.";

    private final PayrollRepository payrollRepository;
    private final StoreRepository storeRepository;
    private final TaxReportSendLogRepository taxReportSendLogRepository;
    private final EmailSender emailSender;

    /* ==================== 조회/생성 ==================== */

    /** 기간 내 신고 대상 급여(확정·지급완료) 조회. */
    @Transactional(readOnly = true)
    public List<Payroll> getReportablePayrolls(Long storeId, LocalDate from, LocalDate to) {
        return payrollRepository.findByStoreIdAndPeriod(storeId, from, to).stream()
                .filter(p -> p.getStatus() == PayrollStatus.CONFIRMED || p.getStatus() == PayrollStatus.PAID)
                .toList();
    }

    /**
     * 인건비 내역서 PDF — 직원별 세전/공제/실지급 집계 + 매장 합계.
     * 사장의 발송 전 미리보기와 이메일 첨부 양쪽에서 사용.
     */
    @Transactional(readOnly = true)
    public byte[] generateLaborCostSummaryPdf(Long storeId, LocalDate from, LocalDate to) {
        Store store = findStore(storeId);
        List<Payroll> payrolls = getReportablePayrolls(storeId, from, to);
        Map<String, EmployeeAggregate> byEmployee = aggregateByEmployee(payrolls);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, baos);

            BaseFont bf;
            try {
                bf = BaseFont.createFont("HYSMyeongJoStd-Medium", "UniKS-UCS2-H", BaseFont.NOT_EMBEDDED);
            } catch (Exception ignored) {
                bf = BaseFont.createFont();
            }
            Font fontTitle = new Font(bf, 16, Font.BOLD);
            Font fontH = new Font(bf, 9, Font.BOLD);
            Font fontN = new Font(bf, 9);

            document.open();
            document.add(new Paragraph("인건비 내역서 (세무 신고용)", fontTitle));
            document.add(new Paragraph(" ", fontN));
            document.add(new Paragraph("매장: " + store.getStoreName()
                    + " (사업자번호: " + store.getBusinessNumber() + ")", fontN));
            document.add(new Paragraph("정산기간: " + from + " ~ " + to, fontN));
            document.add(new Paragraph("포함 급여: 확정·지급완료 " + payrolls.size() + "건", fontN));
            document.add(new Paragraph(" ", fontN));

            PdfPTable table = new PdfPTable(new float[]{2.2f, 1f, 1.6f, 1.3f, 1.3f, 1.3f, 1.3f, 1.3f, 1.5f, 1.6f});
            table.setWidthPercentage(100);
            for (String h : new String[]{"직원명", "건수", "세전 지급총액", "국민연금", "건강보험",
                    "장기요양", "고용보험", "소득세(3.3%)", "공제총액", "실지급총액"}) {
                table.addCell(new com.lowagie.text.Phrase(h, fontH));
            }

            EmployeeAggregate total = new EmployeeAggregate();
            for (Map.Entry<String, EmployeeAggregate> e : byEmployee.entrySet()) {
                EmployeeAggregate a = e.getValue();
                addRow(table, fontN, e.getKey(), a);
                total.add(a);
            }
            addRow(table, fontH, "합계", total);
            document.add(table);

            document.add(new Paragraph(" ", fontN));
            document.add(new Paragraph(DISCLAIMER, fontN));
            document.add(new Paragraph("발급: 소담(SODAM)", fontN));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("인건비 내역서 PDF 생성 실패 storeId={}", storeId, e);
            throw new BusinessException("인건비 내역서 생성에 실패했어요.", "TAX_REPORT_GENERATION_FAILED");
        }
    }

    /**
     * 급여 상세 CSV — 세무사가 신고 프로그램에 옮겨 쓸 수 있는 건별 세전 데이터.
     * UTF-8 BOM 포함(Excel 호환). PII 최소화: 이름만 포함(주민번호 등 미포함).
     */
    @Transactional(readOnly = true)
    public byte[] generateLaborCostCsv(Long storeId, LocalDate from, LocalDate to) {
        List<Payroll> payrolls = getReportablePayrolls(storeId, from, to);
        StringBuilder sb = new StringBuilder();
        sb.append('﻿'); // UTF-8 BOM
        sb.append("직원명,기간시작,기간종료,기본급,연장수당,야간수당,휴일수당,주휴수당,보너스,세전총액,")
                .append("국민연금,건강보험,장기요양,고용보험,소득세(3.3%),공제총액,실지급액,상태\n");
        for (Payroll p : payrolls) {
            boolean withholding = isWithholdingPolicy(p);
            sb.append(csvSafe(employeeName(p))).append(',')
                    .append(p.getStartDate()).append(',')
                    .append(p.getEndDate()).append(',')
                    .append(nz(p.getRegularWage())).append(',')
                    .append(nz(p.getOvertimeWage())).append(',')
                    .append(nz(p.getNightWorkWage())).append(',')
                    .append(nz(p.getHolidayWorkWage())).append(',')
                    .append(nz(p.getWeeklyAllowance())).append(',')
                    .append(nz(p.getBonusWage())).append(',')
                    .append(nz(p.getGrossWage())).append(',')
                    .append(withholding ? 0 : nz(p.getNationalPensionDeduction())).append(',')
                    .append(withholding ? 0 : nz(p.getHealthInsuranceDeduction())).append(',')
                    .append(withholding ? 0 : nz(p.getLongTermCareDeduction())).append(',')
                    .append(withholding ? 0 : nz(p.getEmploymentInsuranceDeduction())).append(',')
                    .append(withholding ? nz(p.getTaxAmount()) : 0).append(',')
                    .append(nz(p.getTaxAmount())).append(',')
                    .append(nz(p.getNetWage())).append(',')
                    .append(p.getStatus() == null ? "" : p.getStatus().getDescription()).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /* ==================== 발송 ==================== */

    /**
     * 인건비 내역서(PDF+CSV)를 매장 세무사 이메일로 발송하고 이력을 남긴다.
     *
     * @param force false 면 같은 정산기간에 이미 성공 발송 이력이 있을 때 409 (중복 발송 방지).
     *              FE 가 "이미 보냈어요. 다시 보낼까요?" 확인 후 force=true 로 재호출.
     */
    public TaxReportSendLog sendToAccountant(Long ownerId, Long storeId,
                                             LocalDate from, LocalDate to, boolean force) {
        Store store = findStore(storeId);
        String recipient = store.getTaxAccountantEmail();
        if (recipient == null || recipient.isBlank()) {
            throw new BusinessException("세무사 이메일이 등록되어 있지 않아요. 매장 설정에서 먼저 등록해 주세요.",
                    "TAX_ACCOUNTANT_EMAIL_MISSING");
        }
        if (!force && taxReportSendLogRepository.existsByStore_IdAndPeriodStartAndPeriodEndAndStatus(
                storeId, from, to, TaxReportSendLog.SendStatus.SENT)) {
            throw new com.rich.sodam.exception.ConflictException(
                    "이 정산기간은 이미 발송된 이력이 있어요.", "TAX_REPORT_ALREADY_SENT");
        }

        List<Payroll> payrolls = getReportablePayrolls(storeId, from, to);
        if (payrolls.isEmpty()) {
            throw new BusinessException("발송할 확정 급여가 없어요. 급여를 먼저 확정해 주세요.",
                    "TAX_REPORT_NO_CONFIRMED_PAYROLL");
        }
        long totalGross = payrolls.stream().mapToLong(p -> nz(p.getGrossWage())).sum();

        byte[] pdf = generateLaborCostSummaryPdf(storeId, from, to);
        byte[] csv = generateLaborCostCsv(storeId, from, to);
        String baseName = String.format("인건비내역서_%s_%s_%s", store.getStoreName(), from, to);
        String subject = String.format("[소담] %s 인건비 내역서 (%s ~ %s)", store.getStoreName(), from, to);
        String body = String.format(
                "안녕하세요.%n%n소담(SODAM)에서 발송한 %s 매장의 인건비 내역서입니다.%n"
                        + "정산기간: %s ~ %s%n포함 급여: 확정·지급완료 %d건%n세전 지급총액: %,d원%n%n"
                        + "첨부: 인건비 내역서 PDF(직원별 집계), 급여 상세 CSV(건별 세전 데이터)%n%n%s",
                store.getStoreName(), from, to, payrolls.size(), totalGross, DISCLAIMER);

        // 외부 I/O(SMTP)는 트랜잭션 밖 — 발송 결과에 따라 이력만 별도 저장
        EmailSender.SendResult result = emailSender.sendWithAttachments(recipient, subject, body, List.of(
                new EmailSender.Attachment(baseName + ".pdf", "application/pdf", pdf),
                new EmailSender.Attachment(baseName + ".csv", "text/csv", csv)));

        TaxReportSendLog sendLog = new TaxReportSendLog(store, from, to, recipient,
                payrolls.size(), totalGross,
                result.isSuccess() ? TaxReportSendLog.SendStatus.SENT : TaxReportSendLog.SendStatus.FAILED,
                result.isSuccess() ? null : truncate(result.getDetail()), ownerId);
        taxReportSendLogRepository.save(sendLog);

        if (!result.isSuccess()) {
            log.error("세무사 인건비 내역서 발송 실패 storeId={} detail={}", storeId, result.getDetail());
            throw new BusinessException("이메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.",
                    "TAX_REPORT_SEND_FAILED");
        }
        log.info("세무사 인건비 내역서 발송 완료 storeId={} period={}~{} payrolls={}", storeId, from, to, payrolls.size());
        return sendLog;
    }

    @Transactional(readOnly = true)
    public List<TaxReportSendLog> getSendHistory(Long storeId) {
        return taxReportSendLogRepository.findByStore_IdOrderBySentAtDesc(storeId);
    }

    @Transactional
    public void updateAccountantEmail(Long storeId, String email) {
        Store store = findStore(storeId);
        store.setTaxAccountantEmail(email == null || email.isBlank() ? null : email.trim());
        storeRepository.save(store);
    }

    /* ==================== 내부 유틸 ==================== */

    private Store findStore(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없어요."));
    }

    private Map<String, EmployeeAggregate> aggregateByEmployee(List<Payroll> payrolls) {
        Map<String, EmployeeAggregate> byEmployee = new LinkedHashMap<>();
        for (Payroll p : payrolls) {
            byEmployee.computeIfAbsent(employeeName(p), k -> new EmployeeAggregate()).addPayroll(p);
        }
        return byEmployee;
    }

    private static void addRow(PdfPTable t, Font f, String name, EmployeeAggregate a) {
        t.addCell(new com.lowagie.text.Phrase(name, f));
        t.addCell(new com.lowagie.text.Phrase(String.valueOf(a.count), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.gross), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.nationalPension), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.healthInsurance), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.longTermCare), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.employmentInsurance), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.withholdingTax), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.totalDeduction), f));
        t.addCell(new com.lowagie.text.Phrase(String.format("%,d", a.net), f));
    }

    private static String employeeName(Payroll p) {
        return p.getEmployee() != null && p.getEmployee().getUser() != null
                ? p.getEmployee().getUser().getName() : "(미상)";
    }

    /** PayrollService.isWithholdingPolicy 와 동일 판정 — 3.3% 원천징수 건인지. */
    private static boolean isWithholdingPolicy(Payroll p) {
        return p.getTaxRate() != null && Math.abs(p.getTaxRate() - 0.033) < 1e-9;
    }

    private static int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() <= 500 ? s : s.substring(0, 500);
    }

    private static String csvSafe(String s) {
        if (s == null) return "";
        boolean needQuote = s.contains(",") || s.contains("\"") || s.contains("\n");
        String escaped = s.replace("\"", "\"\"");
        return needQuote ? "\"" + escaped + "\"" : escaped;
    }

    /** 직원별 집계 누적기 */
    private static class EmployeeAggregate {
        int count;
        long gross;
        long nationalPension;
        long healthInsurance;
        long longTermCare;
        long employmentInsurance;
        long withholdingTax;
        long totalDeduction;
        long net;

        void addPayroll(Payroll p) {
            count++;
            gross += nz(p.getGrossWage());
            if (isWithholdingPolicy(p)) {
                withholdingTax += nz(p.getTaxAmount());
            } else {
                nationalPension += nz(p.getNationalPensionDeduction());
                healthInsurance += nz(p.getHealthInsuranceDeduction());
                longTermCare += nz(p.getLongTermCareDeduction());
                employmentInsurance += nz(p.getEmploymentInsuranceDeduction());
            }
            totalDeduction += nz(p.getTaxAmount());
            net += nz(p.getNetWage());
        }

        void add(EmployeeAggregate o) {
            count += o.count;
            gross += o.gross;
            nationalPension += o.nationalPension;
            healthInsurance += o.healthInsurance;
            longTermCare += o.longTermCare;
            employmentInsurance += o.employmentInsurance;
            withholdingTax += o.withholdingTax;
            totalDeduction += o.totalDeduction;
            net += o.net;
        }
    }
}
