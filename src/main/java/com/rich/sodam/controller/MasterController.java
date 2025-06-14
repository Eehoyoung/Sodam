package com.rich.sodam.controller;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.dto.CombinedStatsDto;
import com.rich.sodam.dto.MasterMyPageResponseDto;
import com.rich.sodam.dto.MasterProfileResponseDto;
import com.rich.sodam.service.MasterProfileService;
import com.rich.sodam.service.TimeOffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/master")
public class MasterController {

    private final MasterProfileService masterProfileService;
    private final TimeOffService timeOffService;

    @Autowired
    public MasterController(MasterProfileService masterProfileService, TimeOffService timeOffService) {
        this.masterProfileService = masterProfileService;
        this.timeOffService = timeOffService;
    }

    /**
     * 사장 마이페이지 데이터 조회
     * 사장 정보, 소유 매장 목록, 통합 통계, 휴가 신청 내역 등을 포함
     */
    @GetMapping("/mypage")
    public ResponseEntity<MasterMyPageResponseDto> getMasterMyPage(@RequestParam Long masterId) {
        // 사장 프로필 조회
        MasterProfile masterProfile = masterProfileService.getMasterProfile(masterId);

        // 사장이 소유한 매장 목록 조회
        List<Store> stores = masterProfileService.getStoresByMaster(masterId);

        // 통합 통계 조회
        Map<String, Object> statsMap = masterProfileService.getCombinedStats(masterId);
        CombinedStatsDto combinedStats = new CombinedStatsDto(
                (int) statsMap.get("totalStores"),
                (int) statsMap.get("totalEmployees"),
                (long) statsMap.get("totalLaborCost"),
                (int) statsMap.get("pendingTimeOffRequests")
        );

        // 휴가 신청 내역 조회
        List<TimeOff> timeOffRequests = timeOffService.getPendingTimeOffsByMaster(masterId);

        // DTO 변환 및 반환
        MasterMyPageResponseDto responseDto = MasterMyPageResponseDto.fromEntities(
                masterProfile, stores, combinedStats, timeOffRequests);

        return ResponseEntity.ok(responseDto);
    }

    /**
     * 사장 프로필 조회
     */
    @GetMapping("/profile")
    public ResponseEntity<MasterProfileResponseDto> getMasterProfile(@RequestParam Long masterId) {
        MasterProfile profile = masterProfileService.getMasterProfile(masterId);
        MasterProfileResponseDto responseDto = MasterProfileResponseDto.fromEntity(profile);
        return ResponseEntity.ok(responseDto);
    }

    /**
     * 사장 프로필 업데이트
     */
    @PutMapping("/profile")
    public ResponseEntity<MasterProfile> updateMasterProfile(
            @RequestParam Long masterId,
            @RequestParam String businessLicenseNumber) {
        MasterProfile updatedProfile = masterProfileService.updateMasterProfile(masterId, businessLicenseNumber);
        return ResponseEntity.ok(updatedProfile);
    }

    /**
     * 사장이 소유한 매장 목록 조회
     */
    @GetMapping("/stores")
    public ResponseEntity<List<Store>> getStoresByMaster(@RequestParam Long masterId) {
        List<Store> stores = masterProfileService.getStoresByMaster(masterId);
        return ResponseEntity.ok(stores);
    }

    /**
     * 특정 매장의 통계 조회
     */
    @GetMapping("/store/stats")
    public ResponseEntity<Map<String, Object>> getStoreStats(
            @RequestParam Long storeId,
            @RequestParam String month) {
        Map<String, Object> stats = masterProfileService.getStoreStats(storeId, month);
        return ResponseEntity.ok(stats);
    }

    /**
     * 사장이 소유한 모든 매장의 통합 통계 조회
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getCombinedStats(@RequestParam Long masterId) {
        Map<String, Object> stats = masterProfileService.getCombinedStats(masterId);
        return ResponseEntity.ok(stats);
    }

    /**
     * 사장이 소유한 모든 매장의 대기 중인 휴가 신청 조회
     */
    @GetMapping("/timeoff/pending")
    public ResponseEntity<List<TimeOff>> getPendingTimeOffs(@RequestParam Long masterId) {
        List<TimeOff> timeOffs = timeOffService.getPendingTimeOffsByMaster(masterId);
        return ResponseEntity.ok(timeOffs);
    }

    /**
     * 휴가 신청 승인
     */
    @PutMapping("/timeoff/approve")
    public ResponseEntity<TimeOff> approveTimeOff(@RequestParam Long timeOffId) {
        TimeOff timeOff = timeOffService.approveTimeOffRequest(timeOffId);
        return ResponseEntity.ok(timeOff);
    }

    /**
     * 휴가 신청 거부
     */
    @PutMapping("/timeoff/reject")
    public ResponseEntity<TimeOff> rejectTimeOff(@RequestParam Long timeOffId) {
        TimeOff timeOff = timeOffService.rejectTimeOffRequest(timeOffId);
        return ResponseEntity.ok(timeOff);
    }
}
