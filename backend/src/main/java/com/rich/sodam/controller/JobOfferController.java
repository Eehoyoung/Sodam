package com.rich.sodam.controller;

import com.rich.sodam.dto.request.JobOfferCreateRequest;
import com.rich.sodam.dto.request.JobOfferRespondRequest;
import com.rich.sodam.dto.response.JobOfferResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.JobOfferService;
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
 * 채용 제안(JobOffer) API — 사장→구직자 인앱 제안 발송/응답(260711_작업통합.md Part 2 §15.3).
 *
 * <p>발송은 매장 스코프이므로 {@link StoreAuthorizationPolicy} 로 소유 검증 후에만 진행한다(가드 호출은 try
 * 블록 밖). 응답({@code /respond})은 수신자 본인 검증을 서비스 레이어에서 수행한다(제안을 먼저 로드
 * 해야 대상을 알 수 있으므로 경로만으로는 가드를 걸 수 없다 — {@code StoreAuthorizationPolicy.assertMasterOwnsTimeOff}
 * 와 동일한 "엔티티 로드 후 소유 검증" 패턴).</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "채용 제안(JobOffer)", description = "사장→구직자 인앱 채용 제안 발송/조회/응답")
public class JobOfferController {

    private final JobOfferService jobOfferService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @MasterOnly
    @Operation(summary = "채용 제안 발송", description = "대상이 구직중인지, 구직 유형이 일치하는지 재검증 후 제안을 발송합니다.")
    @PostMapping("/api/stores/{storeId}/job-offers")
    public ResponseEntity<JobOfferResponse> sendOffer(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody JobOfferCreateRequest request) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        JobOfferResponse response = jobOfferService.sendOffer(storeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @EmployeeOrMaster
    @Operation(summary = "내가 받은 채용 제안 목록", description = "PENDING 우선 정렬, 만료는 조회 시점 lazy 판정으로 반영합니다.")
    @GetMapping("/api/job-offers/me")
    public ResponseEntity<List<JobOfferResponse>> getMyOffers(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(jobOfferService.getMyOffers(principal.getId()));
    }

    @EmployeeOrMaster
    @Operation(summary = "채용 제안 수락/거절", description = "수신자 본인만 응답할 수 있습니다. 수락 응답에만 매장 초대코드(storeCode)가 포함됩니다.")
    @PutMapping("/api/job-offers/{offerId}/respond")
    public ResponseEntity<JobOfferResponse> respondToOffer(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long offerId,
            @Valid @RequestBody JobOfferRespondRequest request) {
        return ResponseEntity.ok(jobOfferService.respondToOffer(offerId, principal.getId(), request.accept()));
    }
}
