package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.EmployeeResignationRequestRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 퇴사 확인서 전자서명 개시(260817 퇴사 처리 기능 계획서 WP-4).
 *
 * <p><b>사장 전용, 매니저 위임 없음(HC-9)</b>: {@link ElectronicSignatureApplicationService#
 * createResignationAcknowledgment}는 {@code DelegatedActionAuthorityService.Authority}(CONTRACT_MANAGE
 * 대리 권한 조회)를 쓰지 않는다 — 인가는 이 서비스를 호출하는 컨트롤러의
 * {@code assertMasterOwnsStore}가 담당한다.</p>
 *
 * <p><b>fail-safe(HC-13)</b>: {@code sodam.integration.electronic-signature.mode}의 기본값은
 * {@code off}다 — 이 경우 서명 코어 서비스 빈 자체가 없어 {@code createResignationAcknowledgment}가
 * {@link IllegalStateException}을 던진다. 이 예외를 그대로 흘리면(500) 운영에서 통합을 켜기
 * 전까지 서명 요청 자체가 에러가 된다 — 대신 "비활성" 결과를 명시적으로 반환해 호출부(FE)가
 * 안내로 처리하게 한다. 사직 확인(acknowledge) 자체는 이 서비스와 무관하게 항상 동작한다.</p>
 */
@Service
@RequiredArgsConstructor
public class EmployeeResignationSignatureService {

    private final EmployeeResignationRequestRepository resignationRepo;
    private final EmployeeResignationPdfService pdfService;
    private final ElectronicSignatureApplicationService signatureAppService;
    private final StoreRepository storeRepo;

    public record SignatureRequestResult(boolean available, Long envelopeId, String message) {
    }

    @Transactional
    public SignatureRequestResult requestSignature(Long requestId, Long masterUserId) {
        EmployeeResignationRequest request = resignationRepo.findByIdForUpdate(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        if (request.getAgreedResignationDate() == null) {
            // HC-12 — 협의 미확정 상태에서 서명 개시 불가. 가드 소유권은 여기(WP-4)에 있다.
            throw new BusinessException("퇴사일 협의가 아직 끝나지 않았어요.", "RESIGNATION_DATE_NOT_AGREED");
        }
        if (request.getSignatureEnvelopeId() != null) {
            return new SignatureRequestResult(true, request.getSignatureEnvelopeId(), "이미 서명이 진행 중이에요.");
        }
        if (request.getRelation() == null || request.getRelation().getStore() == null) {
            throw new IllegalArgumentException("신청 대상 매장을 확인할 수 없어요.");
        }
        Long storeId = request.getRelation().getStore().getId();
        Store store = storeRepo.findById(storeId).orElse(null);
        User employee = request.getRequester();
        byte[] pdf = pdfService.generate(request, store, employee);

        try {
            ElectronicSignatureEnvelope envelope = signatureAppService.createResignationAcknowledgment(
                    masterUserId, requestId, storeId, employee.getId(), 1, pdf);
            request.linkSignatureEnvelope(envelope.getId());
            return new SignatureRequestResult(true, envelope.getId(), null);
        } catch (IllegalStateException e) {
            return new SignatureRequestResult(false, null,
                    "전자서명이 아직 활성화되지 않았어요 — 서면으로 확인해 주세요.");
        }
    }
}
