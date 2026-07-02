package com.rich.sodam.controller;

import com.rich.sodam.dto.response.CampaignResponse;
import com.rich.sodam.service.CampaignService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 인앱 시즌 캠페인 (T-NEW-07). 홈 배너용 — 현재 활성 캠페인 목록.
 */
@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@Tag(name = "캠페인", description = "시즌 세무 안내 배너")
public class CampaignController {

    private final CampaignService campaignService;

    @Operation(summary = "활성 캠페인", description = "현재 시기에 노출할 캠페인 배너 목록(종소세 5월·부가세 1·7월 등).")
    @GetMapping("/active")
    public ResponseEntity<List<CampaignResponse>> active() {
        return ResponseEntity.ok(campaignService.activeCampaigns(LocalDate.now()));
    }
}
