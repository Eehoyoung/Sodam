package com.rich.sodam.controller;

import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.JobPostingNearbyItemResponse;
import com.rich.sodam.dto.response.JobPostingResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.JobPostingService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 구인 공고(JobPosting) API — 사장 매장당 1건 upsert + 직원용 주변 구인 리스트
 * (260711_작업통합.md Part 2 §19.3).
 *
 * <p>매장 스코프 엔드포인트는 {@link StoreAccessGuard} 로 소유 검증 후에만 진행한다(가드 호출은 try
 * 블록 밖).</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "구인 공고(JobPosting)", description = "사장 구인 공고 upsert + 직원용 주변 구인 리스트")
public class JobPostingController {

    private final JobPostingService jobPostingService;
    private final StoreAccessGuard storeAccessGuard;

    @MasterOnly
    @Operation(summary = "구인 공고 upsert", description = "매장당 1건만 유지됩니다. 존재하면 내용을 갈아끼우고, 없으면 새로 만듭니다. open 필드로 ON/OFF도 함께 지정합니다.")
    @PutMapping("/api/stores/{storeId}/job-posting")
    public ResponseEntity<JobPostingResponse> upsertPosting(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody JobPostingUpsertRequest request) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(jobPostingService.upsertPosting(storeId, request));
    }

    @MasterOnly
    @Operation(summary = "내 매장 구인 공고 조회")
    @GetMapping("/api/stores/{storeId}/job-posting")
    public ResponseEntity<JobPostingResponse> getMyPosting(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(jobPostingService.getMyPosting(storeId));
    }

    @EmployeeOrMaster
    @Operation(summary = "주변 구인 매장 리스트", description = "내 희망지역(§2 #4) 기준 4km 이내 구인중(open) 공고를 거리 오름차순으로 반환합니다. workType/category 쿼리로 필터링할 수 있습니다.")
    @GetMapping("/api/job-postings/nearby")
    public ResponseEntity<List<JobPostingNearbyItemResponse>> getNearbyPostings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String workType,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(jobPostingService.getNearbyPostings(principal.getId(), workType, category));
    }
}
