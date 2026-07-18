package com.rich.sodam.controller;

import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.dto.response.MyRequestResponse;
import com.rich.sodam.repository.AttendanceCorrectionRequestRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.TimeOffService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * 내 요청 현황(정정·휴가 통합) 컨트롤러 — 휴가 거부 사유 전달 회귀 테스트.
 *
 * <p>버그: 휴가(TimeOff) 항목을 {@link MyRequestResponse}로 변환할 때 rejectReason 을
 * 하드코딩된 null 로 넘겨, TimeOffApprovalScreen 에서 사장이 입력한 거부 사유가
 * 직원의 "내 요청" 화면(RequestStatusScreen)에는 절대 표시되지 않았다.</p>
 */
@ExtendWith(MockitoExtension.class)
class MyRequestControllerTest {

    @Mock
    private AttendanceCorrectionRequestRepository correctionRepo;
    @Mock
    private TimeOffService timeOffService;

    @Test
    void rejectedTimeOff_carriesRejectReasonThrough() {
        when(correctionRepo.findByRequester_IdOrderByRequestedAtDesc(anyLong())).thenReturn(List.of());

        TimeOff rejected = new TimeOff(null, null,
                LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 10), "개인 사정");
        rejected.reject("성수기라 대체 인력 확보가 어려워요");
        when(timeOffService.getTimeOffsByEmployee(anyLong())).thenReturn(List.of(rejected));

        MyRequestController controller = new MyRequestController(correctionRepo, timeOffService);
        UserPrincipal principal = new UserPrincipal(5L, "emp@x.com", List.of());

        ResponseEntity<List<MyRequestResponse>> response = controller.myRequests(principal);

        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).rejectReason())
                .isEqualTo("성수기라 대체 인력 확보가 어려워요");
        assertThat(response.getBody().get(0).status()).isEqualTo("rejected");
    }
}
