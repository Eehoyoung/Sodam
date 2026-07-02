package com.rich.sodam.controller;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.dto.CombinedStatsDto;
import com.rich.sodam.dto.MasterMyPageResponseDto;
import com.rich.sodam.dto.MasterProfileResponseDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.MasterProfileService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.TimeOffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 사장 마이페이지/통계 컨트롤러.
 *
 * 보안: 모든 masterId 는 query 파라미터가 아닌 principal.id 강제 사용.
 * 매장/timeOff 접근 시 StoreAccessGuard 로 소유권 검증.
 */
@MasterOnly
@RestController
@RequestMapping("/api/master")
public class MasterController {

    private final MasterProfileService masterProfileService;
    private final TimeOffService timeOffService;
    private final StoreAccessGuard guard;

    @Autowired
    public MasterController(MasterProfileService masterProfileService,
                            TimeOffService timeOffService,
                            StoreAccessGuard guard) {
        this.masterProfileService = masterProfileService;
        this.timeOffService = timeOffService;
        this.guard = guard;
    }

    /** 사장 마이페이지 데이터 조회 — 본인 데이터만. */
    @GetMapping("/mypage")
    public ResponseEntity<MasterMyPageResponseDto> getMasterMyPage(
            @AuthenticationPrincipal UserPrincipal principal) {
        Long masterId = principal.getId();
        MasterProfile masterProfile = masterProfileService.getMasterProfile(masterId);
        List<Store> stores = masterProfileService.getStoresByMaster(masterId);
        Map<String, Object> statsMap = masterProfileService.getCombinedStats(masterId);
        CombinedStatsDto combinedStats = new CombinedStatsDto(
                (int) statsMap.get("totalStores"),
                (int) statsMap.get("totalEmployees"),
                (long) statsMap.get("totalLaborCost"),
                (int) statsMap.get("pendingTimeOffRequests")
        );
        List<TimeOff> timeOffRequests = timeOffService.getPendingTimeOffsByMaster(masterId);
        return ResponseEntity.ok(MasterMyPageResponseDto.fromEntities(
                masterProfile, stores, combinedStats, timeOffRequests));
    }

    @GetMapping("/profile")
    public ResponseEntity<MasterProfileResponseDto> getMasterProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        MasterProfile profile = masterProfileService.getMasterProfile(principal.getId());
        return ResponseEntity.ok(MasterProfileResponseDto.fromEntity(profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<MasterProfile> updateMasterProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String businessLicenseNumber) {
        return ResponseEntity.ok(masterProfileService.updateMasterProfile(principal.getId(), businessLicenseNumber));
    }

    @GetMapping("/stores")
    public ResponseEntity<List<Store>> getStoresByMaster(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(masterProfileService.getStoresByMaster(principal.getId()));
    }

    @GetMapping("/store/stats")
    public ResponseEntity<Map<String, Object>> getStoreStats(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId,
            @RequestParam String month) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(masterProfileService.getStoreStats(storeId, month));
    }

    // [Compat] RN 경로 호환
    @GetMapping("/stats/store/{storeId}")
    public ResponseEntity<Map<String, Object>> getStoreStatsCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) String month) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        String m = (month == null || month.isBlank()) ? java.time.YearMonth.now().toString() : month;
        return ResponseEntity.ok(masterProfileService.getStoreStats(storeId, m));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getCombinedStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(masterProfileService.getCombinedStats(principal.getId()));
    }

    // [Compat] RN 경로 호환
    @GetMapping("/stats/overall")
    public ResponseEntity<Map<String, Object>> getCombinedStatsCompat(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(masterProfileService.getCombinedStats(principal.getId()));
    }

    @GetMapping("/timeoff/pending")
    public ResponseEntity<List<TimeOff>> getPendingTimeOffs(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(timeOffService.getPendingTimeOffsByMaster(principal.getId()));
    }

    @PutMapping("/timeoff/approve")
    public ResponseEntity<TimeOff> approveTimeOff(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long timeOffId) {
        guard.assertMasterOwnsTimeOff(principal.getId(), timeOffId);
        return ResponseEntity.ok(timeOffService.approveTimeOffRequest(timeOffId));
    }

    @PutMapping("/timeoff/reject")
    public ResponseEntity<TimeOff> rejectTimeOff(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long timeOffId) {
        guard.assertMasterOwnsTimeOff(principal.getId(), timeOffId);
        return ResponseEntity.ok(timeOffService.rejectTimeOffRequest(timeOffId));
    }

    // [Compat] RN 경로 호환
    @PutMapping("/timeoff/{timeOffId}/approve")
    public ResponseEntity<TimeOff> approveTimeOffCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long timeOffId) {
        guard.assertMasterOwnsTimeOff(principal.getId(), timeOffId);
        return ResponseEntity.ok(timeOffService.approveTimeOffRequest(timeOffId));
    }

    @PutMapping("/timeoff/{timeOffId}/reject")
    public ResponseEntity<TimeOff> rejectTimeOffCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long timeOffId) {
        guard.assertMasterOwnsTimeOff(principal.getId(), timeOffId);
        return ResponseEntity.ok(timeOffService.rejectTimeOffRequest(timeOffId));
    }
}
