package com.rich.sodam.controller;

import com.rich.sodam.dto.response.PublicCalculatorResponse;
import com.rich.sodam.security.annotation.PublicEndpoint;
import com.rich.sodam.service.PublicCalculatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 비로그인 공개 계산기(WP-A) — 주휴수당·최저임금·4대보험.
 *
 * <p>현 단계 최대 병목은 매장 확보인데 유입 채널이 없다. 소상공인이 검색으로 가장 많이 찾는 것이
 * "주휴수당 계산"이라, 이미 있는 급여 코어를 <b>노출만</b> 해서 유입 경로를 만든다.</p>
 *
 * <h3>비인증 공개 API 로서의 제약</h3>
 * <ul>
 *   <li><b>DB 를 조회하지 않는다</b> — 입력값만으로 계산한다. 조회가 없으면 정보 노출 자체가 성립하지 않는다.</li>
 *   <li><b>rate limit 필수</b> — {@code RateLimitFilter}가 {@code /api/public/**}를 IP 단위로 제한한다.
 *       인증이 없으니 남용 표면이 넓다.</li>
 *   <li><b>세무사·노무사 연결 CTA 를 붙이지 않는다</b> — 계산 결과에서 곧바로 전문가 알선으로 이어지면
 *       세무사법이 우려하는 "소개·알선"에 근접한다(2026-08-07 세무 검토).</li>
 * </ul>
 *
 * <p>모든 응답에 면책이 포함된다 — 3자 교차검증이 정한 배포 조건이다.</p>
 */
@PublicEndpoint
@RestController
@RequestMapping("/api/public/calculators")
@RequiredArgsConstructor
@Tag(name = "공개 계산기", description = "로그인 없이 쓰는 주휴수당·최저임금·4대보험 계산기")
public class PublicCalculatorController {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final PublicCalculatorService publicCalculatorService;

    @Operation(summary = "주휴수당 계산",
            description = "1주 소정근로시간과 시급으로 주휴수당을 추정합니다. 결근·지각·조퇴, 주 중 입·퇴사는 반영되지 않습니다.")
    @GetMapping("/weekly-holiday")
    public ResponseEntity<PublicCalculatorResponse.WeeklyHoliday> weeklyHoliday(
            @RequestParam double weeklyHours,
            @RequestParam int hourlyWage) {
        return ResponseEntity.ok(publicCalculatorService.weeklyHoliday(weeklyHours, hourlyWage));
    }

    @Operation(summary = "최저임금 미달 확인", description = "해당 연도 최저시급과 비교합니다. year 생략 시 올해 기준.")
    @GetMapping("/minimum-wage")
    public ResponseEntity<PublicCalculatorResponse.MinimumWageCheck> minimumWage(
            @RequestParam int hourlyWage,
            @RequestParam(required = false) Integer year) {
        int targetYear = year != null ? year : LocalDate.now(SEOUL).getYear();
        return ResponseEntity.ok(publicCalculatorService.minimumWage(targetYear, hourlyWage));
    }

    @Operation(summary = "4대보험 공제 추정",
            description = "월 급여(세전)로 근로자 부담 4대보험을 추정합니다. 소득세는 반영하지 않습니다.")
    @GetMapping("/social-insurance")
    public ResponseEntity<PublicCalculatorResponse.SocialInsurance> socialInsurance(
            @RequestParam int monthlyWage) {
        return ResponseEntity.ok(publicCalculatorService.socialInsurance(monthlyWage));
    }
}
