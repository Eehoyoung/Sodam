package com.rich.sodam.controller;

import com.rich.sodam.domain.AttendanceCorrectionRequest;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.dto.response.MyRequestResponse;
import com.rich.sodam.repository.AttendanceCorrectionRequestRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.TimeOffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 직원 본인이 보낸 요청(정정·휴가)의 통합 현황. S3 (E-NEW-04).
 *
 * <p>기존엔 정정({@code /api/attendance/correction-requests/me})과
 * 휴가가 분리돼 FE {@code RequestStatusScreen} 이 한곳에서 못 봤다(주석 TODO).
 * 이 엔드포인트가 본인 기준으로 둘을 합쳐 일자 내림차순으로 돌려준다.
 * 본인 토큰 주체로만 조회 — 타인 id 입력 불가.
 */
@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
@Tag(name = "내 요청", description = "직원이 보낸 정정·휴가 요청 통합 현황")
public class MyRequestController {

    private final AttendanceCorrectionRequestRepository correctionRepo;
    private final TimeOffService timeOffService;

    @Operation(summary = "내 요청 현황(정정·휴가 통합)")
    @GetMapping("/my")
    @Transactional(readOnly = true)
    public ResponseEntity<List<MyRequestResponse>> myRequests(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<MyRequestResponse> result = new ArrayList<>();

        for (AttendanceCorrectionRequest r :
                correctionRepo.findByRequester_IdOrderByRequestedAtDesc(principal.getId())) {
            String date = r.getRequestedAt() != null ? r.getRequestedAt().toLocalDate().toString() : null;
            result.add(new MyRequestResponse(
                    "correction", r.getId(), "출퇴근 정정", date,
                    r.getStatus().name().toLowerCase(), r.getReason(), r.getRejectReason()));
        }

        for (TimeOff t : timeOffService.getTimeOffsByEmployee(principal.getId())) {
            String date = t.getStartDate() != null ? t.getStartDate().toString() : null;
            String title = "휴가 " + t.getStartDate() + (t.getEndDate() != null && !t.getEndDate().equals(t.getStartDate())
                    ? " ~ " + t.getEndDate() : "");
            result.add(new MyRequestResponse(
                    "timeoff", t.getId(), title, date,
                    t.getStatus().name().toLowerCase(), t.getReason(), null));
        }

        result.sort(Comparator.comparing(
                (MyRequestResponse m) -> m.date() == null ? "" : m.date()).reversed());
        return ResponseEntity.ok(result);
    }
}
