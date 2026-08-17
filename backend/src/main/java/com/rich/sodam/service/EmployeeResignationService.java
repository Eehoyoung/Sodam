package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier;
import com.rich.sodam.domain.EmployeeResignationDateProposal;
import com.rich.sodam.domain.EmployeeResignationDateProposal.ProposerRole;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.User;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.EmployeeResignationDateProposalRepository;
import com.rich.sodam.repository.EmployeeResignationRequestRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 직원 사직서 제출·철회·사장 확인 서비스(260817 퇴사 처리 기능 계획서 WP-1, 3차 정정).
 *
 * <p><b>확인(acknowledge)은 사장 전용</b>이다 — 매니저 위임 없음. 사직 수리는 근로계약 종료
 * 의사표시를 수리하는 행위(민법 §660)라 {@code CONTRACT_MANAGE}의 실질에 가깝다는 판단에 따라
 * L-1 해소 전까지는 확장하지 않는다(인가는 컨트롤러에서 {@code assertMasterOwnsStore}만 사용).</p>
 *
 * <p><b>desiredResignationDate/agreedResignationDate는 데이터 캡처 전용</b>이다(HC-1) — 급여
 * 계산·보존기간 기산 로직 어디에도 전달하지 않는다.</p>
 */
@Service
@RequiredArgsConstructor
public class EmployeeResignationService {

    private final EmployeeResignationRequestRepository resignationRepo;
    private final EmployeeResignationDateProposalRepository proposalRepo;
    private final EmployeeStoreRelationRepository relationRepo;
    private final MasterStoreRelationRepository masterStoreRelationRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;
    private final StorePermissionRecipientService permissionRecipients;

    /** 신청 결과 — forbidden=true면 본인 소속이 아니거나 이미 비활성 소속. */
    public record RequestResult(Long id, String status, boolean forbidden, String forbiddenReason) {
    }

    /**
     * relationId를 클라이언트에게서 받지 않는다 — (storeId, 본인 employeeId)로 내부에서 소속을
     * 조회해 타인 소속을 지정할 여지 자체를 없앤다(BOLA를 사후 검증이 아니라 설계로 차단).
     */
    @Transactional
    public RequestResult requestResignation(Long storeId, Long requesterUserId,
                                             LocalDate desiredResignationDate, String reason) {
        EmployeeStoreRelation relation = relationRepo.findByEmployeeProfile_IdAndStore_Id(requesterUserId, storeId)
                .orElse(null);
        if (relation == null) {
            return new RequestResult(null, null, true, "본인 소속에 대해서만 신청할 수 있어요.");
        }
        if (!Boolean.TRUE.equals(relation.getIsActive())) {
            throw new BusinessException("이미 퇴사 처리된 소속이에요.", "RESIGNATION_RELATION_INACTIVE");
        }
        resignationRepo.findByRelation_IdAndStatus(relation.getId(), EmployeeResignationRequest.Status.PENDING)
                .ifPresent(existing -> {
                    throw new BusinessException("이미 대기 중인 사직 신청이 있어요.", "RESIGNATION_ALREADY_PENDING");
                });

        User requester = userRepo.findById(requesterUserId).orElseThrow();
        EmployeeResignationRequest request = resignationRepo.save(
                EmployeeResignationRequest.create(relation, requester, desiredResignationDate, reason));
        // 최초 희망일도 협의 이력의 첫 제안으로 남긴다(WP-3) — agree()/counterPropose()가
        // "마지막 제안"을 균일하게 다룰 수 있도록.
        proposalRepo.save(EmployeeResignationDateProposal.create(request, ProposerRole.EMPLOYEE, desiredResignationDate));

        notifyOwners(relation, requester.getName(), "사직 신청이 도착했어요",
                (requester.getName() == null || requester.getName().isBlank() ? "직원" : requester.getName())
                        + "님이 사직을 신청했어요.", "RESIGNATION_REQUESTED");

        return new RequestResult(request.getId(), request.getStatus().name(), false, null);
    }

    @Transactional
    public void withdraw(Long requestId, Long requesterUserId) {
        EmployeeResignationRequest request = resignationRepo.findByIdForUpdate(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        assertRequester(request, requesterUserId);
        if (!request.isPending()) {
            throw new BusinessException("대기 중인 신청만 철회할 수 있어요.", "RESIGNATION_NOT_PENDING");
        }
        request.withdraw();
    }

    /**
     * WP-3 — 상대의 마지막 제안에 동의해 협의를 확정한다. 신청자 본인 또는 그 매장 사장만
     * 호출할 수 있다(BOLA는 {@link #resolveActorRole}이 판정).
     */
    @Transactional
    public void agree(Long requestId, Long actorUserId) {
        EmployeeResignationRequest request = resignationRepo.findByIdForUpdate(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        if (!request.isPending()) {
            throw new BusinessException("대기 중인 신청만 협의할 수 있어요.", "RESIGNATION_NOT_PENDING");
        }
        ProposerRole actorRole = resolveActorRole(request, actorUserId);
        EmployeeResignationDateProposal last = proposalRepo.findTopByRequest_IdOrderByProposedAtDesc(requestId)
                .orElseThrow(() -> new IllegalStateException("제안 이력이 없어요."));
        if (last.getProposerRole() == actorRole) {
            throw new BusinessException("본인이 마지막으로 제안한 날짜에는 동의할 수 없어요.",
                    "RESIGNATION_CANNOT_AGREE_OWN_PROPOSAL");
        }
        last.markAccepted();
        request.agreeOn(last.getProposedDate());
        notifyCounterparty(request, actorRole, "퇴사일에 합의했어요",
                "합의된 퇴사일: " + last.getProposedDate(), "RESIGNATION_DATE_AGREED");
    }

    /** WP-3 — 대안 날짜를 새로 제안한다(기존 이력은 그대로 보존 — append-only). */
    @Transactional
    public void counterPropose(Long requestId, Long actorUserId, LocalDate newDate) {
        EmployeeResignationRequest request = resignationRepo.findByIdForUpdate(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        if (!request.isPending()) {
            throw new BusinessException("대기 중인 신청만 협의할 수 있어요.", "RESIGNATION_NOT_PENDING");
        }
        ProposerRole actorRole = resolveActorRole(request, actorUserId);
        proposalRepo.save(EmployeeResignationDateProposal.create(request, actorRole, newDate));
        notifyCounterparty(request, actorRole, "새 퇴사일이 제안됐어요",
                "제안된 날짜: " + newDate, "RESIGNATION_DATE_COUNTER_PROPOSED");
    }

    @Transactional(readOnly = true)
    public List<EmployeeResignationDateProposal> proposals(Long requestId, Long actorUserId) {
        EmployeeResignationRequest request = resignationRepo.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        resolveActorRole(request, actorUserId); // 당사자 검증(BOLA), 결과값은 쓰지 않는다
        return proposalRepo.findByRequest_IdOrderByProposedAtAsc(requestId);
    }

    /** 호출자가 신청자 본인이면 EMPLOYEE, 그 매장 사장이면 MASTER — 둘 다 아니면 403. */
    private ProposerRole resolveActorRole(EmployeeResignationRequest request, Long actorUserId) {
        if (request.getRequester() != null && request.getRequester().getId().equals(actorUserId)) {
            return ProposerRole.EMPLOYEE;
        }
        if (request.getRelation() != null && request.getRelation().getStore() != null) {
            Long storeId = request.getRelation().getStore().getId();
            if (masterStoreRelationRepo.existsByMasterProfile_IdAndStore_Id(actorUserId, storeId)) {
                return ProposerRole.MASTER;
            }
        }
        throw new AccessDeniedException("본인 신청 또는 소유 매장의 신청만 처리할 수 있어요.");
    }

    private void notifyCounterparty(EmployeeResignationRequest request, ProposerRole actorRole, String title, String body, String type) {
        Long recipientUserId = actorRole == ProposerRole.EMPLOYEE
                ? firstOwnerId(request)
                : (request.getRequester() != null ? request.getRequester().getId() : null);
        if (recipientUserId == null) {
            return;
        }
        notificationService.push(recipientUserId, PushNotifier.PushMessage.builder()
                .title(title)
                .body(body)
                .deepLink("sodam://resignation")
                .data(Map.of("type", type))
                .build());
    }

    private Long firstOwnerId(EmployeeResignationRequest request) {
        if (request.getRelation() == null || request.getRelation().getStore() == null) {
            return null;
        }
        return permissionRecipients.owners(request.getRelation().getStore().getId())
                .stream().findFirst().orElse(null);
    }

    /**
     * 확인(접수 확인) — 비활성화가 아니다. 협의(WP-3)가 확정된 뒤에만 가능하다.
     * 매장 소유 검증은 컨트롤러의 {@code assertMasterOwnsStore}가 이미 마친 뒤 호출된다.
     */
    @Transactional
    public void acknowledge(Long requestId, Long masterUserId) {
        EmployeeResignationRequest request = resignationRepo.findByIdForUpdate(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        if (!request.isPending()) {
            throw new BusinessException("대기 중인 신청만 확인할 수 있어요.", "RESIGNATION_NOT_PENDING");
        }
        if (request.getAgreedResignationDate() == null) {
            throw new BusinessException("퇴사일 협의가 아직 끝나지 않았어요.", "RESIGNATION_DATE_NOT_AGREED");
        }
        request.acknowledge();

        if (request.getRequester() != null) {
            notificationService.push(request.getRequester().getId(), PushNotifier.PushMessage.builder()
                    .title("사장님이 사직 신청을 확인했어요")
                    .body("퇴사 처리는 실제 마지막 근무일에 별도로 진행돼요.")
                    .deepLink("sodam://resignation")
                    .data(Map.of("type", "RESIGNATION_ACKNOWLEDGED"))
                    .build());
        }
    }

    /**
     * WP-4 — 서명 완료(VERIFIED) 후 {@link ElectronicSignatureWorker}가 호출한다. 봉투 연결만
     * 하고 status는 건드리지 않는다(HC-2) — 서명 완료가 확인(acknowledge)의 전제조건이 아니라
     * 병행 증적일 뿐이라는 설계(HC-13)를 그대로 반영한다.
     */
    @Transactional
    public void linkVerifiedSignatureEnvelope(Long requestId, Long envelopeId) {
        resignationRepo.findById(requestId).ifPresent(r -> r.linkSignatureEnvelope(envelopeId));
    }

    @Transactional(readOnly = true)
    public List<EmployeeResignationRequest> myRequests(Long requesterUserId) {
        return resignationRepo.findByRequester_IdOrderByRequestedAtDesc(requesterUserId);
    }

    /** 목록 조회는 컨트롤러가 assertMasterOwnsStore로 매장 소유를 검증한 뒤 호출한다. */
    @Transactional(readOnly = true)
    public List<EmployeeResignationRequest> storeRequests(Long storeId) {
        return resignationRepo.findByRelation_Store_IdOrderByRequestedAtDesc(storeId);
    }

    /** 컨트롤러가 대상 매장 id를 가드 이전에 조회할 수 있도록 제공. */
    @Transactional(readOnly = true)
    public Long resolveStoreIdForRequest(Long requestId) {
        EmployeeResignationRequest request = resignationRepo.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없어요."));
        if (request.getRelation() == null || request.getRelation().getStore() == null) {
            throw new IllegalArgumentException("신청 대상 매장을 확인할 수 없어요.");
        }
        return request.getRelation().getStore().getId();
    }

    void assertRequester(EmployeeResignationRequest request, Long requesterUserId) {
        if (request.getRequester() == null || !request.getRequester().getId().equals(requesterUserId)) {
            throw new org.springframework.security.access.AccessDeniedException("본인 신청만 처리할 수 있어요.");
        }
    }

    private void notifyOwners(EmployeeStoreRelation relation, String requesterName, String title, String body, String type) {
        if (relation.getStore() == null || relation.getStore().getId() == null) {
            return;
        }
        for (Long ownerUserId : permissionRecipients.owners(relation.getStore().getId())) {
            notificationService.push(ownerUserId, PushNotifier.PushMessage.builder()
                    .title(title)
                    .body(body)
                    .deepLink("sodam://resignation")
                    .data(Map.of("type", type))
                    .build());
        }
    }
}
