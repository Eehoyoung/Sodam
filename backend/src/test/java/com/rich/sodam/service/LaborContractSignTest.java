package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * S1 전자 근로계약서 서명 로직 검증 — 본인 서명/타인 거부/멱등.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborContractSignTest {

    @Autowired
    private LaborContractService service;
    @Autowired
    private StoreRepository storeRepository;

    private LaborContract newContract(Long employeeId) {
        // 계약 정규화(normalizeCompensation)가 매장의 5인 이상 여부를 조회하므로 실제 매장 필요
        Store store = storeRepository.save(
                new Store("서명테스트매장", "1234567890", "02-000-0000", "카페", 10_320, 100));
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
        return service.save(c);
    }

    @Test
    @DisplayName("직원 본인 서명 시 signed=true 로 기록된다")
    void signsByOwner() {
        LaborContract saved = newContract(1L);
        assertThat(saved.isSigned()).isFalse();

        LaborContract signed = service.sign(saved.getId(), 1L, null);

        assertThat(signed.isSigned()).isTrue();
        assertThat(signed.getEmployeeSignedAt()).isNotNull();
    }

    @Test
    @DisplayName("서명 이미지가 함께 전달되면 저장된다")
    void signsWithSignatureImage() {
        LaborContract saved = newContract(1L);

        LaborContract signed = service.sign(saved.getId(), 1L, "iVBORw0KGgoAAAANSUhEUgAAAAE=");

        assertThat(signed.getEmployeeSignatureImage()).isEqualTo("iVBORw0KGgoAAAANSUhEUgAAAAE=");
    }

    @Test
    @DisplayName("타인이 서명 시도하면 AccessDeniedException")
    void rejectsOtherEmployee() {
        LaborContract saved = newContract(1L);

        assertThatThrownBy(() -> service.sign(saved.getId(), 99L, null))
                .isInstanceOf(AccessDeniedException.class);

        // 서명되지 않은 상태가 유지된다
        assertThat(service.findById(saved.getId()).isSigned()).isFalse();
    }

    @Test
    @DisplayName("중복 서명은 멱등 — 최초 서명 시각이 유지된다")
    void signIsIdempotent() {
        LaborContract saved = newContract(1L);

        LocalDateTime firstSignedAt = service.sign(saved.getId(), 1L, null).getEmployeeSignedAt();
        assertThat(firstSignedAt).isNotNull();

        LaborContract second = service.sign(saved.getId(), 1L, null);

        assertThat(second.isSigned()).isTrue();
        assertThat(second.getEmployeeSignedAt()).isEqualTo(firstSignedAt);
    }
}
