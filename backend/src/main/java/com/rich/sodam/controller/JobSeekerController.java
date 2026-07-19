package com.rich.sodam.controller;

import com.rich.sodam.dto.request.JobSeekingUpdateRequest;
import com.rich.sodam.dto.response.JobSeekerListItemResponse;
import com.rich.sodam.dto.response.JobSeekingProfileResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.JobSeekingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 인증채용(구직) API — 내 구직 프로필 조회/수정 + 사장용 매장 주변 구직자 리스트
 * (260711_작업통합.md Part 2 §5.1).
 *
 * <p>{@code /me} 경로는 JWT principal 의 userId 만 사용한다 — 경로/바디로 타인 userId 를 받지 않아
 * BOLA 를 원천 차단한다. 사장 리스트는 매장 스코프이므로 {@link StoreAuthorizationPolicy} 로 소유 검증 후에만
 * 진행한다(가드 호출은 try 블록 밖).</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "인증채용(구직)", description = "구직 프로필 조회/수정 + 사장용 매장 주변 구직자 리스트")
public class JobSeekerController {

    private final JobSeekingService jobSeekingService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @EmployeeOrMaster
    @Operation(summary = "내 구직 프로필 조회",
            description = "구직 상태·자격(인증 이력)·현재 소속을 함께 반환합니다. 프로필이 없으면 기본값(구직 OFF)으로 응답합니다(404 아님).")
    @GetMapping("/api/job-seekers/me")
    public ResponseEntity<JobSeekingProfileResponse> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(jobSeekingService.getMyProfile(principal.getId()));
    }

    @EmployeeOrMaster
    @Operation(summary = "내 구직 프로필 수정",
            description = "구직 상태 토글 + 희망지역/유형/업종/근무가능시간 부분 업데이트(null 필드는 기존값 유지). "
                    + "구직 ON 전환 시 자격·희망지역 2개·유형 1개 이상·업종 1~3개·요일 1개 이상을 검증합니다.")
    @PutMapping("/api/job-seekers/me")
    public ResponseEntity<JobSeekingProfileResponse> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody JobSeekingUpdateRequest request) {
        return ResponseEntity.ok(jobSeekingService.updateMyProfile(principal.getId(), request));
    }

    @MasterOnly
    @Operation(summary = "매장 주변 구직자 리스트",
            description = "매장 반경 4km 이내 구직중인 인증 이력 보유자를 거리 오름차순으로 반환합니다. "
                    + "workType(SUBSTITUTE|REGULAR), availableOn(YYYY-MM-DD) 쿼리로 필터링할 수 있습니다.")
    @GetMapping("/api/stores/{storeId}/job-seekers")
    public ResponseEntity<List<JobSeekerListItemResponse>> getJobSeekersForStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) String workType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate availableOn) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(jobSeekingService.getJobSeekersForStore(storeId, workType, availableOn));
    }
}
