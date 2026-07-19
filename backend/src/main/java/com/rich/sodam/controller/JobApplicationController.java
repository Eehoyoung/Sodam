package com.rich.sodam.controller;

import com.rich.sodam.dto.request.JobApplicationCreateRequest;
import com.rich.sodam.dto.request.JobApplicationRespondRequest;
import com.rich.sodam.dto.response.JobApplicantListItemResponse;
import com.rich.sodam.dto.response.JobApplicationResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.JobApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 구인 공고 지원(JobApplication) API — 직원 지원/조회 + 사장 지원자 리스트/응답
 * (260711_작업통합.md Part 2 §19.3). {@link JobOfferController}(§15)의 역방향이다.
 *
 * <p>{@code respond} 는 경로에 storeId 가 없어 {@link StoreAuthorizationPolicy} 를 컨트롤러에서 걸 수 없다 —
 * 서비스 레이어가 지원 건을 로드해 소유 매장을 검증한다({@code JobApplicationService} javadoc 참고).
 * 나머지 매장 스코프 엔드포인트({@code GET .../job-applications})는 가드 호출을 try 블록 밖에 둔다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "구인 공고 지원(JobApplication)", description = "직원 지원/조회 + 사장 지원자 리스트/응답")
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @EmployeeOrMaster
    @Operation(summary = "구인 공고 지원", description = "소담 출퇴근 이력이 있어야 지원할 수 있습니다(구직 ON 여부와 무관). 마감된 공고 지원 시 400, 중복 대기중 지원 시 409.")
    @PostMapping("/api/job-postings/{postingId}/applications")
    public ResponseEntity<JobApplicationResponse> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long postingId,
            @RequestBody(required = false) @Valid JobApplicationCreateRequest request) {
        JobApplicationResponse response = jobApplicationService.apply(postingId, principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @EmployeeOrMaster
    @Operation(summary = "내 지원 현황 조회")
    @GetMapping("/api/job-applications/me")
    public ResponseEntity<List<JobApplicationResponse>> getMyApplications(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(jobApplicationService.getMyApplications(principal.getId()));
    }

    @MasterOnly
    @Operation(summary = "매장 지원자 리스트 조회")
    @GetMapping("/api/stores/{storeId}/job-applications")
    public ResponseEntity<List<JobApplicantListItemResponse>> getApplicationsForStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(jobApplicationService.getApplicationsForStore(storeId));
    }

    @MasterOnly
    @Operation(summary = "지원 수락/거절", description = "수락 시에만 지원자에게 매장 초대코드가 알림으로 전달됩니다. 타 매장 명의로 응답 시 403.")
    @PutMapping("/api/job-applications/{id}/respond")
    public ResponseEntity<JobApplicantListItemResponse> respond(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody JobApplicationRespondRequest request) {
        return ResponseEntity.ok(jobApplicationService.respondToApplication(id, principal.getId(), request.accept()));
    }
}
