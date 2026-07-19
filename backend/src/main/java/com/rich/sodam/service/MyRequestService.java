package com.rich.sodam.service;

import com.rich.sodam.domain.AttendanceCorrectionRequest;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.dto.response.MyRequestResponse;
import com.rich.sodam.repository.AttendanceCorrectionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 직원 본인이 보낸 요청(정정·휴가)의 통합 현황. S3 (E-NEW-04).
 *
 * <p>기존엔 정정({@code /api/attendance/correction-requests/me})과
 * 휴가가 분리돼 FE {@code RequestStatusScreen} 이 한곳에서 못 봤다(주석 TODO).
 * 이 서비스가 본인 기준으로 둘을 합쳐 일자 내림차순으로 돌려준다.
 * 본인 토큰 주체로만 조회 — 타인 id 입력 불가(WP-09: {@code MyRequestController}에서 이관).
 */
@Service
@RequiredArgsConstructor
public class MyRequestService {

    private final AttendanceCorrectionRequestRepository correctionRepo;
    private final TimeOffService timeOffService;

    @Transactional(readOnly = true)
    public List<MyRequestResponse> myRequests(Long userId) {
        List<MyRequestResponse> result = new ArrayList<>();

        for (AttendanceCorrectionRequest r :
                correctionRepo.findByRequester_IdOrderByRequestedAtDesc(userId)) {
            String date = r.getRequestedAt() != null ? r.getRequestedAt().toLocalDate().toString() : null;
            result.add(new MyRequestResponse(
                    "correction", r.getId(), "출퇴근 정정", date,
                    r.getStatus().name().toLowerCase(), r.getReason(), r.getRejectReason()));
        }

        for (TimeOff t : timeOffService.getTimeOffsByEmployee(userId)) {
            String date = t.getStartDate() != null ? t.getStartDate().toString() : null;
            String title = "휴가 " + t.getStartDate() + (t.getEndDate() != null && !t.getEndDate().equals(t.getStartDate())
                    ? " ~ " + t.getEndDate() : "");
            result.add(new MyRequestResponse(
                    "timeoff", t.getId(), title, date,
                    t.getStatus().name().toLowerCase(), t.getReason(), t.getRejectReason()));
        }

        result.sort(Comparator.comparing(
                (MyRequestResponse m) -> m.date() == null ? "" : m.date()).reversed());
        return result;
    }
}
