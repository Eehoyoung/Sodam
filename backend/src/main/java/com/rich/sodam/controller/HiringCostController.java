package com.rich.sodam.controller;

import com.rich.sodam.dto.response.HiringCostResponse;
import com.rich.sodam.service.HiringCostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 채용 총비용 시뮬레이터 API — 로그인만 필요, 매장 무관.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "채용 비용 시뮬레이터", description = "시급·주간 근무시간 기준 월 예상 인건비(사업주 관점) 개략 추정")
public class HiringCostController {

    private final HiringCostService hiringCostService;

    @Operation(summary = "채용 총비용 시뮬레이션",
            description = "기본급·주휴수당(15h 기준)·4대보험 사업주 부담분·퇴직금 적립을 월환산(4.345배)으로 추정. 시급 1,000~1,000,000원, 주 1~52시간.")
    @GetMapping("/api/labor/hiring-cost")
    public ResponseEntity<HiringCostResponse> simulate(
            @RequestParam int hourlyWage,
            @RequestParam double weeklyHours) {
        return ResponseEntity.ok(hiringCostService.simulate(hourlyWage, weeklyHours));
    }
}
