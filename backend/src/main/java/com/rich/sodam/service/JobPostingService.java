package com.rich.sodam.service;

import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.JobCategory;
import com.rich.sodam.domain.type.JobWorkType;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.JobPostingNearbyItemResponse;
import com.rich.sodam.dto.response.JobPostingResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 구인 공고(JobPosting) 서비스 — 매장당 1건 upsert + 직원용 주변 구인 리스트
 * (260711_작업통합.md Part 2 §19.3, Phase 5).
 *
 * <p><b>매장당 1건 upsert 레이스</b>(§10 Phase 5 동시성 리스크 2): {@code store_id} UNIQUE(V55)가
 * 최종 방어선이다. find-then-decide 로 구현하되, 최초 생성이 동시에 경합해 유니크 제약을 위반하면
 * {@link DataIntegrityViolationException} 을 잡아 기존 행을 다시 조회해 update 로 재시도한다 —
 * "SELECT ... FOR UPDATE" 로 사전에 잠가도 행이 아직 없는 최초 생성 레이스 자체는 막을 수 없어(잠글
 * 대상이 없음), catch-then-retry 가 더 단순하면서 결과적으로 동일한 안전성을 준다(§15/§19의 다른
 * 두 엔티티와 동일한 "이중 방어" 스타일).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobPostingService {

    /** 매장별 출퇴근 인증 반경과 무관한 별도 상수(§4-4, JobSeekingService 와 동일). */
    private static final int MATCH_RADIUS_METERS = 4_000;

    private final JobPostingRepository jobPostingRepository;
    private final StoreRepository storeRepository;
    private final JobSeekingProfileRepository jobSeekingProfileRepository;

    // ─────────────────────────────────────────────────────────────────
    // PUT /api/stores/{storeId}/job-posting
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobPostingResponse upsertPosting(Long storeId, JobPostingUpsertRequest request) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store", storeId));

        JobWorkType workType = parseWorkType(request.workType());
        JobCategory category = parseCategory(request.jobCategory());
        if (workType == JobWorkType.SUBSTITUTE && request.workDate() == null) {
            throw new BusinessException("대타 공고는 근무일을 입력해 주세요.", "JOB_POSTING_WORK_DATE_REQUIRED");
        }

        JobPosting posting = jobPostingRepository.findByStore_Id(storeId).orElse(null);
        if (posting == null) {
            posting = JobPosting.create(store, workType, category, request.workDate(),
                    request.startTime(), request.endTime(), request.hourlyWage(), request.message());
            applyOpenState(posting, request.open());
            try {
                posting = jobPostingRepository.save(posting);
            } catch (DataIntegrityViolationException e) {
                // 동시 최초 upsert 레이스 — 이미 다른 요청이 먼저 만든 행을 다시 조회해 update 로 재시도
                log.info("JobPosting 동시 최초 생성 레이스 감지 — storeId={}, update 로 재시도", storeId);
                JobPosting existing = jobPostingRepository.findByStore_Id(storeId)
                        .orElseThrow(() -> new ConflictException(
                                "공고 저장 중 충돌이 발생했어요. 다시 시도해 주세요.", "CONFLICT"));
                applyUpdate(existing, workType, category, request);
                posting = existing;
            }
        } else {
            applyUpdate(posting, workType, category, request);
        }

        return toResponse(posting);
    }

    private void applyUpdate(JobPosting posting, JobWorkType workType, JobCategory category,
                              JobPostingUpsertRequest request) {
        posting.update(workType, category, request.workDate(), request.startTime(), request.endTime(),
                request.hourlyWage(), request.message());
        applyOpenState(posting, request.open());
    }

    private void applyOpenState(JobPosting posting, Boolean open) {
        if (Boolean.TRUE.equals(open)) {
            posting.openPosting();
        } else {
            posting.closePosting();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/stores/{storeId}/job-posting
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public JobPostingResponse getMyPosting(Long storeId) {
        if (!storeRepository.existsById(storeId)) {
            throw new EntityNotFoundException("Store", storeId);
        }
        JobPosting posting = jobPostingRepository.findByStore_Id(storeId)
                .orElseThrow(() -> new EntityNotFoundException("JobPosting", storeId));
        return toResponse(posting);
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/job-postings/nearby
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JobPostingNearbyItemResponse> getNearbyPostings(Long userId, String workType, String category) {
        JobSeekingProfile profile = jobSeekingProfileRepository.findByUser_Id(userId)
                .filter(JobSeekingProfile::hasCompleteLocations)
                .orElseThrow(() -> new BusinessException("희망지역을 먼저 설정해 주세요.", "JOB_SEEKING_LOCATIONS_REQUIRED"));

        JobWorkType filterType = blankToNull(workType) == null ? null : parseWorkType(workType.trim());
        JobCategory filterCategory = blankToNull(category) == null ? null : parseCategory(category.trim());

        List<JobPostingNearbyItemResponse> result = new ArrayList<>();
        for (JobPosting posting : jobPostingRepository.findByOpenTrue()) {
            Store store = posting.getStore();
            if (store == null || !store.hasLocationSet()) {
                continue;
            }
            Double distance = closestDistanceMeters(store, profile);
            if (distance == null || distance > MATCH_RADIUS_METERS) {
                continue;
            }
            if (filterType != null && posting.getWorkType() != filterType) {
                continue;
            }
            if (filterCategory != null && posting.getJobCategory() != filterCategory) {
                continue;
            }
            result.add(new JobPostingNearbyItemResponse(
                    posting.getId(), store.getId(), store.getStoreName(),
                    posting.getWorkType().name(), posting.getJobCategory().name(), posting.getWorkDate(),
                    posting.getStartTime(), posting.getEndTime(), posting.getHourlyWage(), posting.getMessage(),
                    Math.round(distance)));
        }
        result.sort(Comparator.comparingLong(JobPostingNearbyItemResponse::distanceMeters));
        return result;
    }

    // ─────────────────────────────────────────────────────────────────
    // 공통 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    JobWorkType parseWorkType(String raw) {
        try {
            return JobWorkType.valueOf(raw);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException("근무 형태가 올바르지 않아요.", "JOB_POSTING_INVALID_WORK_TYPE");
        }
    }

    JobCategory parseCategory(String raw) {
        try {
            return JobCategory.valueOf(raw);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException("업종이 올바르지 않아요.", "JOB_POSTING_INVALID_CATEGORY");
        }
    }

    /** 두 희망지역 중 매장에 더 가까운 쪽까지의 거리(미터). 좌표가 둘 다 없으면 null(리스트 제외 대상). */
    private Double closestDistanceMeters(Store store, JobSeekingProfile profile) {
        Double d1 = distanceOrNull(store, profile.getLocation1Latitude(), profile.getLocation1Longitude());
        Double d2 = distanceOrNull(store, profile.getLocation2Latitude(), profile.getLocation2Longitude());
        if (d1 == null) {
            return d2;
        }
        if (d2 == null) {
            return d1;
        }
        return Math.min(d1, d2);
    }

    private Double distanceOrNull(Store store, Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        return GeoUtils.calculateDistance(store.getLatitude(), store.getLongitude(), latitude, longitude);
    }

    private JobPostingResponse toResponse(JobPosting posting) {
        Store store = posting.getStore();
        return new JobPostingResponse(
                posting.getId(), store.getId(), store.getStoreName(),
                posting.getWorkType().name(), posting.getJobCategory().name(), posting.getWorkDate(),
                posting.getStartTime(), posting.getEndTime(), posting.getHourlyWage(), posting.getMessage(),
                posting.isOpen(), posting.getCreatedAt(), posting.getUpdatedAt());
    }
}
