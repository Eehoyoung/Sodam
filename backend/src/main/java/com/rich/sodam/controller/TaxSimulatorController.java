package com.rich.sodam.controller;

import com.rich.sodam.dto.response.TaxSimulationResponse;
import com.rich.sodam.service.TaxSimulatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 세무 시뮬레이터 (T-NEW-05). 매출·지출 → 예상 종합소득세(참고용). 저장 없음.
 */
@RestController
@RequestMapping("/api/tax")
@RequiredArgsConstructor
@Tag(name = "세무 시뮬레이터", description = "매출·지출 입력 → 예상 종합소득세(참고용·세무사 검토 전)")
public class TaxSimulatorController {

    private final TaxSimulatorService taxSimulatorService;

    @Operation(summary = "종소세 시뮬레이션", description = "수입−경비 과세표준으로 누진세율 예상 산출세액 계산.")
    @GetMapping("/simulate")
    public ResponseEntity<TaxSimulationResponse> simulate(
            @RequestParam long income,
            @RequestParam(defaultValue = "0") long expenses) {
        return ResponseEntity.ok(taxSimulatorService.simulate(income, expenses));
    }
}
