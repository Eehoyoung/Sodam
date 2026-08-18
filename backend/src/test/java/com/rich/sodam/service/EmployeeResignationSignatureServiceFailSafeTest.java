package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.EmployeeResignationRequestRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.service.EmployeeResignationSignatureService.SignatureRequestResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

/**
 * WP-4 — 전자서명 개시(EmployeeResignationSignatureService) 단위 테스트. 실제 Spring
 * 컨텍스트·전자서명 통합 없이 fail-safe 분기(HC-13)와 협의 미확정 가드(HC-12)를 확인한다.
 *
 * <p>가장 중요한 테스트는 {@link #fallsBackGracefullyWhenIntegrationDisabled} — 전자서명 통합이
 * 비활성(mode=off)일 때 {@code ElectronicSignatureApplicationService}가 {@link IllegalStateException}을
 * 던지는데, 이걸 그대로 흘리면 운영에서 통합을 켜기 전까지 서명 요청 자체가 500 에러가 된다.</p>
 */
@ExtendWith(MockitoExtension.class)
class EmployeeResignationSignatureServiceFailSafeTest {

    @Mock EmployeeResignationRequestRepository resignationRepo;
    @Mock EmployeeResignationPdfService pdfService;
    @Mock ElectronicSignatureApplicationService signatureAppService;
    @Mock StoreRepository storeRepo;

    private EmployeeResignationRequest buildRequestWithAgreedDate() {
        User employee = new User("failsafe_emp@x.com", "김직원");
        employee.setUserGrade(UserGrade.EMPLOYEE);
        EmployeeProfile profile = new EmployeeProfile(employee);
        Store store = new Store("페일세이프매장", "1234567890", "02-000-0000", "카페", 10_000, 100);
        EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store, 12_000);
        EmployeeResignationRequest request = EmployeeResignationRequest.create(
                relation, employee, LocalDate.now().plusDays(14), "사유");
        request.agreeOn(LocalDate.now().plusDays(21));
        return request;
    }

    @Test
    @DisplayName("HC-13: 전자서명 통합이 비활성(IllegalStateException)이어도 예외를 흘리지 않고 available=false로 응답한다")
    void fallsBackGracefullyWhenIntegrationDisabled() {
        EmployeeResignationSignatureService service = new EmployeeResignationSignatureService(
                resignationRepo, pdfService, signatureAppService, storeRepo);
        EmployeeResignationRequest request = buildRequestWithAgreedDate();
        when(resignationRepo.findByIdForUpdate(1L)).thenReturn(Optional.of(request));
        when(pdfService.generate(any(), any(), any())).thenReturn(new byte[]{1, 2, 3});
        when(signatureAppService.createResignationAcknowledgment(
                any(), any(), any(), any(), anyInt(), any()))
                .thenThrow(new IllegalStateException("전자서명 발급 기능이 비활성화되어 있습니다."));

        SignatureRequestResult result = service.requestSignature(1L, 99L);

        assertThat(result.available()).isFalse();
        assertThat(result.envelopeId()).isNull();
        assertThat(result.message()).isNotBlank();
    }

    @Test
    @DisplayName("HC-12: 협의(agreedResignationDate)가 확정되지 않으면 서명 개시 자체가 거부된다")
    void rejectsWhenDateNotAgreed() {
        EmployeeResignationSignatureService service = new EmployeeResignationSignatureService(
                resignationRepo, pdfService, signatureAppService, storeRepo);
        User employee = new User("failsafe_emp2@x.com", "김직원2");
        employee.setUserGrade(UserGrade.EMPLOYEE);
        EmployeeProfile profile = new EmployeeProfile(employee);
        Store store = new Store("페일세이프매장2", "1234567891", "02-000-0000", "카페", 10_000, 100);
        EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store, 12_000);
        EmployeeResignationRequest request = EmployeeResignationRequest.create(
                relation, employee, LocalDate.now().plusDays(14), "사유"); // agreeOn 호출 없음
        when(resignationRepo.findByIdForUpdate(2L)).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> service.requestSignature(2L, 99L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("RESIGNATION_DATE_NOT_AGREED"));
    }
}
