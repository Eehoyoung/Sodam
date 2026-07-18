package com.rich.sodam.service;

import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.JobResponseStatus;
import com.rich.sodam.domain.type.JobWorkType;
import com.rich.sodam.dto.request.JobOfferCreateRequest;
import com.rich.sodam.dto.response.JobOfferResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.JobOfferRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

/**
 * 채용 제안(JobOffer) 서비스 — 발송/조회/응답(260711_작업통합.md Part 2 §15.3, Phase 5).
 *
 * <p><b>동시 중복 PENDING 방지</b>: {@link #sendOffer}는 사전 조회(사용자 친화적 409)와 DB
 * {@code pending_dedup_key} 유니크 인덱스(최종 정합성, {@link DataIntegrityViolationException} 캐치)의
 * 이중 방어로 구현한다(§10 Phase 5 동시성 리스크 1). "만료 후 재발송 허용" 을 위해, 사전 조회에서
 * 발견한 기존 PENDING 건이 시각상 이미 만료됐다면 그 자리에서 {@link JobOffer#expire()} 를 호출해
 * flush 하여 dedup 키를 비운 뒤 새 제안을 만든다 — insert-before-update 플러시 순서 문제를 피하기
 * 위해 {@code saveAndFlush} 로 즉시 반영한다.</p>
 *
 * <p><b>수락 시 초대코드</b>: {@link Store#getStoreCode()} 는 매장 생성 시 이미 발급되어 있다(불변값).
 * 이 서비스는 그 값을 "새로 발급"하지 않고 수락 시점에만 응답에 포함시킬 뿐이며, 실제 매장 합류는
 * 기존 {@code POST /api/stores/join-by-code}(직원 본인이 코드를 입력해 스스로 가입하는 엔드포인트)를
 * 그대로 호출하는 FE 플로우(R-13)의 책임이다 — 이 서비스가 직원을 매장에 자동 가입시키지 않는다
 * (사용자 동의 없는 자동 합류를 피하기 위한 의도적 설계).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobOfferService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final JobOfferRepository jobOfferRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final JobSeekingProfileRepository jobSeekingProfileRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final NotificationService notificationService;

    // ─────────────────────────────────────────────────────────────────
    // POST /api/stores/{storeId}/job-offers
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobOfferResponse sendOffer(Long storeId, JobOfferCreateRequest request) {
        checkBillingEligibility(storeId);

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store", storeId));
        User target = userRepository.findById(request.targetUserId())
                .orElseThrow(() -> new EntityNotFoundException("User", request.targetUserId()));

        JobWorkType workType = parseWorkType(request.workType());

        JobSeekingProfile profile = jobSeekingProfileRepository.findByUser_Id(target.getId())
                .filter(JobSeekingProfile::isSeeking)
                .orElseThrow(() -> new BusinessException(
                        "구직중이 아닌 상대에게는 제안을 보낼 수 없어요.", "OFFER_TARGET_NOT_SEEKING"));
        if (!profile.getSeekingTypesList().contains(workType.name())) {
            throw new BusinessException("구직자가 원하는 근무 형태가 아니에요.", "OFFER_TYPE_MISMATCH");
        }
        if (workType == JobWorkType.SUBSTITUTE && request.workDate() == null) {
            throw new BusinessException("대타 제안은 근무일을 입력해 주세요.", "JOB_OFFER_WORK_DATE_REQUIRED");
        }

        rejectIfActivePending(storeId, target.getId());

        LocalDateTime expiresAt = calculateExpiresAt(workType, request.workDate(), request.startTime());
        JobOffer offer = JobOffer.propose(store, target, workType, request.workDate(),
                request.startTime(), request.endTime(), request.hourlyWage(), request.message(), expiresAt);
        try {
            offer = jobOfferRepository.save(offer);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청 레이스 — DB 유니크 제약(pending_dedup_key) 위반을 사용자 친화적 409로 변환(이중 방어 뒷단)
            log.info("JobOffer 동시 중복 PENDING 방지 — storeId={} targetUserId={}", storeId, target.getId());
            throw new ConflictException("이미 대기중인 제안이 있어요.", "OFFER_ALREADY_PENDING");
        }

        Long targetUserId = target.getId();
        String storeName = store.getStoreName();
        notificationService.notifyJobOfferReceived(targetUserId, storeName);

        return toResponse(offer);
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/job-offers/me
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JobOfferResponse> getMyOffers(Long userId) {
        return jobOfferRepository.findByTargetUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .sorted(Comparator.comparing(r -> !"PENDING".equals(r.status()))) // PENDING 우선(안정 정렬로 createdAt desc 유지)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // PUT /api/job-offers/{offerId}/respond
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobOfferResponse respondToOffer(Long offerId, Long userId, boolean accept) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new EntityNotFoundException("JobOffer", offerId));
        if (!offer.getTargetUser().getId().equals(userId)) {
            log.warn("권한 거부: user {} 가 offer {} 의 수신자가 아님", userId, offerId);
            throw new AccessDeniedException("본인에게 온 제안만 응답할 수 있어요.");
        }
        if (isExpired(offer)) {
            offer.expire();
        }
        if (!offer.isPending()) {
            throw new ConflictException("이미 응답했거나 만료된 제안이에요.", "OFFER_NOT_PENDING");
        }

        if (accept) {
            offer.accept();
        } else {
            offer.decline();
        }
        offer = jobOfferRepository.save(offer);

        Long ownerUserId = resolveStoreOwnerUserId(offer.getStore().getId());
        if (ownerUserId != null) {
            notificationService.notifyJobOfferResponded(ownerUserId, offer.getTargetUser().getName(), accept);
        }

        return toResponse(offer);
    }

    // ─────────────────────────────────────────────────────────────────
    // 과금 훅(§2 #12, Phase 8 대상)
    // ─────────────────────────────────────────────────────────────────

    /**
     * 매장의 채용 제안 발송 가능 여부(플랜/과금) 판정 훅. v1은 항상 통과한다 — 실제 과금 판정은
     * Phase 8에서 구현한다. 자리 확보 목적으로 지금부터 호출 지점에 배치해둔다.
     */
    private void checkBillingEligibility(Long storeId) {
        // v1: no-op. Phase 8 에서 매장 구독 플랜에 따른 발송 가능 여부를 여기서 판정한다.
    }

    // ─────────────────────────────────────────────────────────────────
    // 공통 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private JobWorkType parseWorkType(String raw) {
        try {
            return JobWorkType.valueOf(raw);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException("근무 형태가 올바르지 않아요.", "JOB_OFFER_INVALID_WORK_TYPE");
        }
    }

    /**
     * 동시 중복 PENDING 사전 방어(이중 방어 앞단). 발견한 기존 PENDING 이 이미 시간상 만료됐다면
     * 그 자리에서 만료 처리 후 즉시 flush 하여 dedup 키를 비운다(§10 Phase 5 리스크 1 — "만료 후
     * 재발송 허용" 사양을 충족하면서 뒤이은 insert 와의 flush 순서 충돌을 피하기 위함).
     */
    private void rejectIfActivePending(Long storeId, Long targetUserId) {
        jobOfferRepository.findByStore_IdAndTargetUser_IdAndStatus(storeId, targetUserId, JobResponseStatus.PENDING)
                .ifPresent(existing -> {
                    if (isExpired(existing)) {
                        existing.expire();
                        jobOfferRepository.saveAndFlush(existing);
                    } else {
                        throw new ConflictException("이미 대기중인 제안이 있어요.", "OFFER_ALREADY_PENDING");
                    }
                });
    }

    private boolean isExpired(JobOffer offer) {
        return offer.isPending() && offer.getExpiresAt().isBefore(LocalDateTime.now(SEOUL));
    }

    /** REGULAR: 생성 +24h. SUBSTITUTE: min(생성 +24h, 근무 시작 시각)(§15.2). */
    private LocalDateTime calculateExpiresAt(JobWorkType workType, java.time.LocalDate workDate, java.time.LocalTime startTime) {
        LocalDateTime plus24h = LocalDateTime.now(SEOUL).plusHours(24);
        if (workType == JobWorkType.REGULAR || workDate == null) {
            return plus24h;
        }
        LocalDateTime workStart = LocalDateTime.of(workDate, startTime);
        return workStart.isBefore(plus24h) ? workStart : plus24h;
    }

    /** 조회/응답 시점 lazy 판정 — DB 는 건드리지 않고(읽기 전용 경로), 응답용 유효 상태만 계산한다. */
    private JobResponseStatus effectiveStatus(JobOffer offer) {
        return isExpired(offer) ? JobResponseStatus.EXPIRED : offer.getStatus();
    }

    /**
     * {@link #effectiveStatus(JobOffer)} 의 공개 진입점 — 다른 서비스가 동일한 lazy 만료 판정 로직을
     * 중복 구현하지 않고 그대로 재사용하도록 공개한다(§10 Phase5 "동일한 판정 메서드로 공유" 원칙,
     * 260711_작업통합.md Part 2 §15.3 offerStatus 필드 갭 해소 — Phase6 팔로우업). DB는 건드리지 않는다.
     */
    public JobResponseStatus effectiveStatusOf(JobOffer offer) {
        return effectiveStatus(offer);
    }

    private Long resolveStoreOwnerUserId(Long storeId) {
        List<MasterStoreRelation> relations = masterStoreRelationRepository.findByStore_Id(storeId);
        return relations.isEmpty() ? null : relations.get(0).getMasterProfile().getId();
    }

    private JobOfferResponse toResponse(JobOffer offer) {
        JobResponseStatus effective = effectiveStatus(offer);
        String storeCode = effective == JobResponseStatus.ACCEPTED ? offer.getStore().getStoreCode() : null;
        return new JobOfferResponse(
                offer.getId(),
                offer.getStore().getId(),
                offer.getStore().getStoreName(),
                offer.getWorkType().name(),
                offer.getWorkDate(),
                offer.getStartTime(),
                offer.getEndTime(),
                offer.getHourlyWage(),
                offer.getMessage(),
                effective.name(),
                offer.getExpiresAt(),
                offer.getCreatedAt(),
                offer.getRespondedAt(),
                storeCode);
    }
}
