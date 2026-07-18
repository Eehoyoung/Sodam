package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator;
import com.rich.sodam.core.electronicsignature.ElectronicSignaturePdfSupport;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.*;
import com.rich.sodam.dto.request.EmploymentAmendmentCreateRequest;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmploymentAmendmentService {
    private static final int DOCUMENT_VERSION = 1;

    private final StoreAccessGuard guard;
    private final EmploymentAmendmentRepository amendmentRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmploymentTypeChangeLogRepository employmentTypeChangeLogRepository;
    private final ElectronicSignatureApplicationService electronicSignatureService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final MonthlySalaryCalculator monthlySalaryCalculator;

    @Transactional
    public EmploymentAmendment createDraft(Long requesterId, Long storeId,
                                            EmploymentAmendmentCreateRequest request) {
        guard.assertMasterOrManagerPermission(requesterId, storeId, ManagerPermission.WAGE_EDIT);
        guard.assertEmployeeInStore(request.employeeId(), storeId);
        validateCompensation(request);
        return amendmentRepository.save(EmploymentAmendment.draft(
                storeId, request.employeeId(), requesterId, request.effectiveDate(), request.employmentType(),
                request.hourlyWage(), request.monthlySalary(),
                request.contractedWeeklyHours(), request.contractedWeeklyDays()));
    }

    @Transactional
    public ElectronicSignatureEnvelope send(Long requesterId, Long storeId, Long amendmentId) {
        guard.assertMasterOrManagerPermission(requesterId, storeId, ManagerPermission.WAGE_EDIT);
        EmploymentAmendment amendment = amendmentRepository.findByIdForUpdate(amendmentId)
                .orElseThrow(() -> new EntityNotFoundException("근로조건 변경계약을 찾을 수 없습니다."));
        assertStore(amendment, storeId);
        if (amendment.getElectronicSignatureEnvelopeId() != null) {
            throw new IllegalStateException("이미 전자서명이 시작된 변경계약입니다.");
        }
        Long ownerId = masterStoreRelationRepository.findFirstByStore_IdOrderByIdAsc(storeId)
                .map(relation -> relation.getMasterProfile().getId())
                .orElseThrow(() -> new EntityNotFoundException("매장 사업주를 찾을 수 없습니다."));
        byte[] pdf = renderFixedPdf(amendment);
        ElectronicSignatureEnvelope envelope = electronicSignatureService.createEmploymentAmendment(
                requesterId, ownerId, amendmentId, storeId, amendment.getEmployeeId(), DOCUMENT_VERSION, pdf);
        amendment.startSigning(envelope.getId(), DOCUMENT_VERSION);
        return envelope;
    }

    @Transactional(readOnly = true)
    public List<EmploymentAmendment> list(Long requesterId, Long storeId, Long employeeId) {
        guard.assertMasterOrManagerPermission(requesterId, storeId, ManagerPermission.WAGE_EDIT);
        return amendmentRepository.findByStoreIdAndEmployeeIdOrderByCreatedAtDesc(storeId, employeeId);
    }

    @Transactional
    public void cancelDraft(Long requesterId, Long storeId, Long amendmentId) {
        guard.assertMasterOrManagerPermission(requesterId, storeId, ManagerPermission.WAGE_EDIT);
        EmploymentAmendment amendment = amendmentRepository.findByIdForUpdate(amendmentId)
                .orElseThrow(() -> new EntityNotFoundException("근로조건 변경계약을 찾을 수 없습니다."));
        assertStore(amendment, storeId);
        amendment.cancel();
    }

    @Transactional
    public EmploymentAmendment markVerified(Long amendmentId, Long envelopeId, int documentVersion,
                                             LocalDateTime verifiedAt) {
        EmploymentAmendment amendment = amendmentRepository.findByIdForUpdate(amendmentId)
                .orElseThrow(() -> new EntityNotFoundException("근로조건 변경계약을 찾을 수 없습니다."));
        amendment.markVerified(envelopeId, documentVersion, verifiedAt);
        if (!amendment.getEffectiveDate().isAfter(LocalDate.now())) apply(amendment);
        return amendment;
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void applyDueVerifiedAmendments() {
        amendmentRepository.findByStatusAndEffectiveDateLessThanEqual(
                EmploymentAmendmentStatus.VERIFIED, LocalDate.now()).forEach(this::apply);
    }

    private void apply(EmploymentAmendment amendment) {
        EmployeeStoreRelation relation = relationRepository.findRelationForUpdate(
                        amendment.getEmployeeId(), amendment.getStoreId())
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        EmploymentType before = relation.getEmploymentType();
        Integer salary = amendment.getEmploymentType() == EmploymentType.MONTHLY_SALARY
                ? amendment.getMonthlySalary() : null;
        boolean typeChanged = relation.applyEmploymentType(amendment.getEmploymentType(), salary);
        if (amendment.getEmploymentType() == EmploymentType.HOURLY) {
            relation.setCustomHourlyWage(amendment.getHourlyWage());
            relation.useCustomWage();
        }
        if (amendment.getContractedWeeklyHours() != null) {
            relation.setContractedWeeklyHours(amendment.getContractedWeeklyHours());
        }
        if (amendment.getContractedWeeklyDays() != null) {
            relation.setContractedWeeklyDays(amendment.getContractedWeeklyDays());
        }
        if (typeChanged) {
            employmentTypeChangeLogRepository.save(EmploymentTypeChangeLog.of(
                    relation.getId(), before, amendment.getEmploymentType(), salary,
                    amendment.getCreatedByUserId()));
        }
        relationRepository.save(relation);
        amendment.markApplied(LocalDateTime.now());
    }

    private void validateCompensation(EmploymentAmendmentCreateRequest request) {
        int minimum = MinimumWage.hourlyFor(request.effectiveDate().getYear()).intValue();
        if (request.employmentType() == EmploymentType.HOURLY && request.hourlyWage() < minimum) {
            throw new IllegalArgumentException("효력일 기준 최저임금 미만의 변경계약은 작성할 수 없습니다.");
        }
        if (request.employmentType() == EmploymentType.MONTHLY_SALARY) {
            int hours = monthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(
                    request.contractedWeeklyHours() == null ? 40.0 : request.contractedWeeklyHours());
            if (request.monthlySalary() < minimum * hours) {
                throw new IllegalArgumentException("효력일 기준 최저임금 월 환산액 미만의 변경계약은 작성할 수 없습니다.");
            }
        }
    }

    private byte[] renderFixedPdf(EmploymentAmendment amendment) {
        Store store = storeRepository.findById(amendment.getStoreId()).orElse(null);
        User employee = userRepository.findById(amendment.getEmployeeId()).orElse(null);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4);
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();
            com.lowagie.text.Font title = ElectronicSignaturePdfSupport.titleFont();
            com.lowagie.text.Font body = ElectronicSignaturePdfSupport.bodyFont();
            document.add(new com.lowagie.text.Paragraph("근로조건 변경계약서", title));
            document.add(new com.lowagie.text.Paragraph("사업장: " + (store == null ? "-" : store.getStoreName()), body));
            document.add(new com.lowagie.text.Paragraph("근로자: " + (employee == null ? "-" : employee.getName()), body));
            document.add(new com.lowagie.text.Paragraph("효력일: " + amendment.getEffectiveDate(), body));
            document.add(new com.lowagie.text.Paragraph("고용형태: " + amendment.getEmploymentType(), body));
            document.add(new com.lowagie.text.Paragraph("시급: " + amendment.getHourlyWage(), body));
            document.add(new com.lowagie.text.Paragraph("월급: " + amendment.getMonthlySalary(), body));
            document.add(new com.lowagie.text.Paragraph("주 소정근로시간: " + amendment.getContractedWeeklyHours(), body));
            document.add(new com.lowagie.text.Paragraph("주 소정근로일: " + amendment.getContractedWeeklyDays(), body));
            document.add(new com.lowagie.text.Paragraph(
                    "본 변경은 사업주와 근로자의 전자서명 검증 완료 후 효력일에 적용됩니다.", body));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("근로조건 변경계약 PDF 생성에 실패했습니다.", e);
        }
    }

    private void assertStore(EmploymentAmendment amendment, Long storeId) {
        if (!storeId.equals(amendment.getStoreId())) {
            throw new org.springframework.security.access.AccessDeniedException("해당 매장의 변경계약이 아닙니다.");
        }
    }
}
