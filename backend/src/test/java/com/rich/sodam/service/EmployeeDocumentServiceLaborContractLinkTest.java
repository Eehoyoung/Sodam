package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeDocument;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.DocumentType;
import com.rich.sodam.dto.response.EmployeeDocumentResponse;
import com.rich.sodam.repository.EmployeeDocumentRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 근로계약서 발송 → 서류함 자동 연동 (사장이 계약을 보내면 직원 서류함에 노출).
 *
 * <p>연동 생성은 {@code LaborContractController#send}가 수행하는
 * {@link EmployeeDocumentService#linkLaborContract} 호출과 동일 경로를 서비스 레이어에서
 * 직접 검증한다. 서명 상태는 저장값이 아니라 {@code labor_contract.employee_signed_at}
 * 원본에서 실시간으로 읽어오므로 드리프트가 없어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeDocumentServiceLaborContractLinkTest {

    @Autowired
    private LaborContractService laborContractService;
    @Autowired
    private EmployeeDocumentService employeeDocumentService;
    @Autowired
    private EmployeeDocumentRepository employeeDocumentRepository;
    @Autowired
    private StoreRepository storeRepository;

    private LaborContract newContract(Long employeeId) {
        // 계약 정규화(normalizeCompensation)가 매장의 5인 이상 여부를 조회하므로 실제 매장 필요
        Store store = storeRepository.save(
                new Store("서류함연동테스트매장", "1234567890", "02-000-0000", "카페", 10_320, 100));
        LaborContract c = new LaborContract();
        c.setEmployeeId(employeeId);
        c.setStoreId(store.getId());
        c.setHourlyWage(10_320);
        c.setWagePaymentMethod(com.rich.sodam.domain.type.WagePaymentMethod.BANK_TRANSFER);
        c.setWageComponents("기본급(시급) + 주휴수당");
        c.setContractedHoursPerWeek(40.0);
        c.setWorkStartTime(LocalTime.of(9, 0));
        c.setWorkEndTime(LocalTime.of(18, 0));
        c.setWeeklyHolidayDay("SUNDAY");
        c.setAnnualLeaveNote("§60에 따라 부여");
        c.setWorkLocation("소담매장 서울점");
        c.setJobDescription("홀 서빙");
        LaborContract saved = laborContractService.save(c);
        // 이 테스트들은 모두 "발송 이후" 상태(서류함 연동·서명)를 검증하므로 발송 처리까지 마친다
        // — LaborContractController#send 와 동일하게 markSent 를 거쳐야 sign()이 허용된다.
        return laborContractService.markSent(saved.getId());
    }

    @Test
    @DisplayName("근로계약서 발송 연동 시 서류함에 LABOR_CONTRACT 서류가 정확히 1건 생성된다")
    void linksLaborContractDocumentOnce() {
        LaborContract saved = newContract(1L);

        employeeDocumentService.linkLaborContract(saved.getStoreId(), 1L, saved.getId(), LocalDate.now());

        List<EmployeeDocument> docs = employeeDocumentRepository
                .findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(1L, saved.getStoreId());
        assertThat(docs).hasSize(1);
        assertThat(docs.get(0).getType()).isEqualTo(DocumentType.LABOR_CONTRACT);
        assertThat(docs.get(0).getFileRef()).isEqualTo(String.valueOf(saved.getId()));
    }

    @Test
    @DisplayName("동일 계약을 재발송(재호출)해도 서류함에 중복 생성되지 않는다")
    void doesNotDuplicateOnResend() {
        LaborContract saved = newContract(1L);

        employeeDocumentService.linkLaborContract(saved.getStoreId(), 1L, saved.getId(), LocalDate.now());
        employeeDocumentService.linkLaborContract(saved.getStoreId(), 1L, saved.getId(), LocalDate.now());

        List<EmployeeDocument> docs = employeeDocumentRepository
                .findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(1L, saved.getStoreId());
        assertThat(docs).hasSize(1);
    }

    @Test
    @DisplayName("서명 전에는 contractSigned=false, 서명 후에는 true+서명시각으로 실시간 반영된다")
    void resolvesSignedStatusLiveFromContract() {
        LaborContract saved = newContract(1L);
        employeeDocumentService.linkLaborContract(saved.getStoreId(), 1L, saved.getId(), LocalDate.now());

        EmployeeDocumentResponse before = findLaborContractDoc(1L, saved.getStoreId());
        assertThat(before.contractId()).isEqualTo(saved.getId());
        assertThat(before.contractSigned()).isFalse();
        assertThat(before.contractSignedAt()).isNull();

        saved.linkElectronicSignature(100L, 1, java.time.LocalDateTime.now());
        laborContractService.activateVerifiedElectronicSignature(
                saved.getId(), 100L, 1, java.time.LocalDateTime.now(), 9L);

        EmployeeDocumentResponse after = findLaborContractDoc(1L, saved.getStoreId());
        assertThat(after.contractSigned()).isTrue();
        assertThat(after.contractSignedAt()).isNotNull();
    }

    private EmployeeDocumentResponse findLaborContractDoc(Long employeeId, Long storeId) {
        return employeeDocumentService.listForEmployee(employeeId, storeId).stream()
                .filter(d -> DocumentType.LABOR_CONTRACT.name().equals(d.type()))
                .findFirst()
                .orElseThrow();
    }
}
