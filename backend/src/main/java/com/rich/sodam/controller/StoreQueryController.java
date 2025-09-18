package com.rich.sodam.controller;

import com.rich.sodam.domain.Store;
import com.rich.sodam.service.StoreQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * StoreRepository의 조회/통계 기능을 API로 노출하는 전용 컨트롤러
 */
@RestController
@RequestMapping("/api/store-queries")
@RequiredArgsConstructor
@Tag(name = "매장 조회/통계", description = "StoreRepository 기반 조회 및 통계 API")
public class StoreQueryController {

    private final StoreQueryService storeQueryService;

    // ==================== Soft Delete 관련 ====================

    @Operation(summary = "활성 매장 전체 조회")
    @GetMapping("/active")
    public ResponseEntity<List<Store>> findAllActive() {
        return ResponseEntity.ok(storeQueryService.findAllActive());
    }

    @Operation(summary = "ID로 활성 매장 조회")
    @GetMapping("/active/{id}")
    public ResponseEntity<Store> findActiveById(@PathVariable Long id) {
        return storeQueryService.findActiveById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "사업자등록번호로 활성 매장 조회")
    @GetMapping("/active/by-business-number")
    public ResponseEntity<Store> findActiveByBusinessNumber(
            @RequestParam String businessNumber) {
        return storeQueryService.findActiveByBusinessNumber(businessNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "삭제된 매장 전체 조회")
    @GetMapping("/deleted")
    public ResponseEntity<List<Store>> findAllDeleted() {
        return ResponseEntity.ok(storeQueryService.findAllDeleted());
    }

    @Operation(summary = "ID로 삭제된 매장 조회")
    @GetMapping("/deleted/{id}")
    public ResponseEntity<Store> findDeletedById(@PathVariable Long id) {
        return storeQueryService.findDeletedById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ==================== 매장 소유권 및 권한 확인 ====================

    @Operation(summary = "사장이 관리하는 활성 매장 목록 조회")
    @GetMapping("/by-master/{userId}")
    public ResponseEntity<List<Store>> findActiveStoresByMaster(@PathVariable Long userId) {
        return ResponseEntity.ok(storeQueryService.findActiveStoresByMaster(userId));
    }

    @Operation(summary = "직원이 소속된 활성 매장 목록 조회")
    @GetMapping("/by-employee/{userId}")
    public ResponseEntity<List<Store>> findActiveStoresByEmployee(@PathVariable Long userId) {
        return ResponseEntity.ok(storeQueryService.findActiveStoresByEmployee(userId));
    }

    @Operation(summary = "특정 사용자가 매장의 사장인지 여부 확인")
    @GetMapping("/ownership/exists")
    public ResponseEntity<Boolean> isMasterOfStore(@RequestParam Long storeId, @RequestParam Long userId) {
        return ResponseEntity.ok(storeQueryService.isMasterOfStore(storeId, userId));
    }

    @Operation(summary = "특정 사용자가 매장의 직원인지 여부 확인")
    @GetMapping("/membership/exists")
    public ResponseEntity<Boolean> isEmployeeOfStore(@RequestParam Long storeId, @RequestParam Long userId) {
        return ResponseEntity.ok(storeQueryService.isEmployeeOfStore(storeId, userId));
    }

    // ==================== 매장 통계 및 관련 데이터 조회 ====================

    @Operation(summary = "활성 직원 수 조회")
    @GetMapping("/{storeId}/stats/employees/active/count")
    public ResponseEntity<Integer> countActiveEmployees(@PathVariable Long storeId) {
        return ResponseEntity.ok(storeQueryService.countActiveEmployees(storeId));
    }

    @Operation(summary = "출근 기록 수 조회")
    @GetMapping("/{storeId}/stats/attendance/count")
    public ResponseEntity<Integer> countAttendance(@PathVariable Long storeId) {
        return ResponseEntity.ok(storeQueryService.countAttendance(storeId));
    }

    @Operation(summary = "급여 기록 수 조회")
    @GetMapping("/{storeId}/stats/payroll/count")
    public ResponseEntity<Integer> countPayroll(@PathVariable Long storeId) {
        return ResponseEntity.ok(storeQueryService.countPayroll(storeId));
    }

    @Operation(summary = "미지급 급여 건수 조회")
    @GetMapping("/{storeId}/stats/payroll/unpaid/count")
    public ResponseEntity<Integer> countUnpaidPayroll(@PathVariable Long storeId) {
        return ResponseEntity.ok(storeQueryService.countUnpaidPayroll(storeId));
    }

    @Operation(summary = "마지막 활동 시간 조회")
    @GetMapping("/{storeId}/last-activity")
    public ResponseEntity<LocalDateTime> findLastActivity(@PathVariable Long storeId) {
        return storeQueryService.findLastActivity(storeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // ==================== 검색 및 필터링 ====================

    @Operation(summary = "매장명으로 활성 매장 검색")
    @GetMapping("/search/by-name")
    public ResponseEntity<List<Store>> searchActiveByName(@RequestParam @Size(max = 100, message = "매장명은 최대 100자까지 허용됩니다.") String storeName) {
        return ResponseEntity.ok(storeQueryService.searchActiveByName(storeName));
    }

    @Operation(summary = "특정 기간 내 생성된 활성 매장 조회")
    @GetMapping("/search/by-created-at")
    public ResponseEntity<List<Store>> findActiveStoresCreatedBetween(
            @Parameter(description = "시작일시", example = "2025-01-01T00:00:00")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "종료일시", example = "2025-12-31T23:59:59")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(storeQueryService.findActiveStoresCreatedBetween(startDate, endDate));
    }

    @Operation(summary = "특정 기간 내 삭제된 매장 조회")
    @GetMapping("/search/deleted-by-deleted-at")
    public ResponseEntity<List<Store>> findDeletedStoresDeletedBetween(
            @Parameter(description = "시작일시", example = "2025-01-01T00:00:00")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "종료일시", example = "2025-12-31T23:59:59")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(storeQueryService.findDeletedStoresDeletedBetween(startDate, endDate));
    }
}
