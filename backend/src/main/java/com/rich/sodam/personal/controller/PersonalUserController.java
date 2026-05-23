package com.rich.sodam.personal.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.dto.response.ApiResponse;
import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.personal.dto.*;
import com.rich.sodam.personal.service.PersonalUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.AnyAuthenticated;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * PersonalUser 전용 컨트롤러 (네임스페이스: /api/personal-users/{userId})
 * - Phase A/B의 핵심 엔드포인트를 제공 (인메모리 구현 기반)
 */
@AnyAuthenticated
@RestController
@RequestMapping("/api/personal-users/{userId}")
public class PersonalUserController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PersonalUserController.class);

    private final PersonalUserService service;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, Object> cacheRedis;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PersonalUserController(PersonalUserService service,
                                  JwtTokenProvider jwtTokenProvider,
                                  @Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> cacheRedis) {
        this.service = service;
        this.jwtTokenProvider = jwtTokenProvider;
        this.cacheRedis = cacheRedis;
    }

    // 인증/인가 및 userId 일치 검증
    private ResponseEntity<ApiResponse<?>> verifyAccess(Long pathUserId, HttpServletRequest request) {
        String token = jwtTokenProvider.resolveToken(request);
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("UNAUTHORIZED", "유효하지 않은 토큰입니다."));
        }
        Long authUserId = jwtTokenProvider.getUserId(token);
        if (Objects.equals(authUserId, pathUserId)) {
            return null; // OK
        }
        // 관리자/운영 권한 허용(ROLE_MASTER, ROLE_MANAGER)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            boolean allowed = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(r -> "ROLE_MASTER".equals(r) || "ROLE_MANAGER".equals(r));
            if (allowed) return null;
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("FORBIDDEN", "다른 사용자의 리소스에 접근할 수 없습니다."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PersonalUserProfileDto>> getProfile(@PathVariable Long userId,
                                                                          HttpServletRequest request) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        PersonalUserProfileDto profile = service.getOrCreateProfile(userId);
        return ResponseEntity.ok(ApiResponse.success("성공", profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<PersonalUserProfileDto>> updateProfile(@PathVariable Long userId,
                                                                             @Valid @RequestBody PersonalUserProfileUpdateRequest body,
                                                                             HttpServletRequest request) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        Integer defaultWage = body.getSettings() != null ? body.getSettings().getDefaultHourlyWage() : null;
        PersonalUserProfileDto updated = service.updateProfile(userId, body.getNickname(), defaultWage);
        return ResponseEntity.ok(ApiResponse.success("성공", updated));
    }

    // 근무지
    @GetMapping("/workplaces")
    public ResponseEntity<ApiResponse<PageResponse<PersonalWorkplaceDto>>> listWorkplaces(
            @PathVariable Long userId,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") Integer limit,
            HttpServletRequest request
    ) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        int l = Math.max(1, Math.min(100, limit));
        PageResponse<PersonalWorkplaceDto> page = service.listWorkplaces(userId, cursor, l);
        return ResponseEntity.ok(ApiResponse.success("성공", page));
    }

    @PostMapping("/workplaces")
    public ResponseEntity<ApiResponse<PersonalWorkplaceDto>> createWorkplace(@PathVariable Long userId,
                                                                             @Valid @RequestBody PersonalWorkplaceCreateRequest body,
                                                                             HttpServletRequest request) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        try {
            PersonalWorkplaceDto dto = service.createWorkplace(userId, body.getName(), body.getAddress(), body.getHourlyWage());
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("생성됨", dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", e.getMessage()));
        }
    }

    @PutMapping("/workplaces/{workplaceId}")
    public ResponseEntity<ApiResponse<PersonalWorkplaceDto>> updateWorkplace(@PathVariable Long userId,
                                                                             @PathVariable Long workplaceId,
                                                                             @Valid @RequestBody PersonalWorkplaceUpdateRequest body,
                                                                             HttpServletRequest request) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        try {
            PersonalWorkplaceDto dto = service.updateWorkplace(userId, workplaceId, body.getName(), body.getAddress(), body.getHourlyWage());
            return ResponseEntity.ok(ApiResponse.success("성공", dto));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("NOT_FOUND", e.getMessage()));
        }
    }

    @DeleteMapping("/workplaces/{workplaceId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteWorkplace(@PathVariable Long userId,
                                                                            @PathVariable Long workplaceId,
                                                                            HttpServletRequest request) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        try {
            service.deleteWorkplace(userId, workplaceId);
            Map<String, Object> res = new HashMap<>();
            res.put("deleted", true);
            return ResponseEntity.ok(ApiResponse.success("삭제됨", res));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("NOT_FOUND", e.getMessage()));
        }
    }

    // 출퇴근 목록
    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<PageResponse<PersonalAttendanceRecordDto>>> listAttendance(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "50") Integer limit,
            HttpServletRequest request
    ) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        int l = Math.max(1, Math.min(100, limit));
        PageResponse<PersonalAttendanceRecordDto> page = service.listAttendance(userId, from, to, cursor, l);
        return ResponseEntity.ok(ApiResponse.success("성공", page));
    }

    // 월별 요약
    @GetMapping("/attendance/monthly")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> monthlySummary(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest request
    ) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        YearMonth ym = YearMonth.of(year, month);
        PageResponse<PersonalAttendanceRecordDto> allPage = service.listAttendance(userId, ym.atDay(1), ym.atEndOfMonth(), null, 1000);
        Map<LocalDate, int[]> agg = new TreeMap<>(); // date -> [minutes, sessions]
        for (PersonalAttendanceRecordDto a : allPage.getItems()) {
            LocalDate d = a.getCheckInAt().toLocalDate();
            int minutes = a.getDurationMinutes() != null ? a.getDurationMinutes() : 0;
            agg.computeIfAbsent(d, k -> new int[]{0, 0});
            agg.get(d)[0] += minutes;
            agg.get(d)[1] += 1;
        }
        List<Map<String, Object>> res = new ArrayList<>();
        agg.forEach((date, arr) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", date.toString());
            m.put("minutes", arr[0]);
            m.put("sessions", arr[1]);
            res.add(m);
        });
        return ResponseEntity.ok(ApiResponse.success("성공", res));
    }

    // 체크인 요청
    public static class CheckInRequest { public Long workplaceId; public String timestamp; public String note; }

    @PostMapping("/attendance/check-in")
    public ResponseEntity<ApiResponse<PersonalAttendanceRecordDto>> checkIn(@PathVariable Long userId,
                                                                            @RequestHeader(value = "Idempotency-Key", required = false) String idemKey,
                                                                            @Valid @RequestBody(required = false) CheckInRequest body,
                                                                            HttpServletRequest request) throws JsonProcessingException {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        if (idemKey == null || idemKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("VALIDATION_ERROR", "Idempotency-Key 헤더가 필요합니다."));
        }
        String payloadHash = hashPayload(body);
        String redisKey = "idem:" + userId + ":" + idemKey;
        Object existing = cacheRedis.opsForValue().get(redisKey);
        if (existing != null) {
            Map stored = (Map) existing;
            String prevHash = (String) stored.get("hash");
            if (!Objects.equals(prevHash, payloadHash)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error("IDEMPOTENCY_CONFLICT", "동일 키에 상이한 요청 본문입니다."));
            }
            Long recordId = (Long) stored.get("rid");
            // 간단히 목록에서 재검색
            PageResponse<PersonalAttendanceRecordDto> page = service.listAttendance(userId, null, null, null, 1000);
            for (PersonalAttendanceRecordDto r : page.getItems()) {
                if (Objects.equals(r.getId(), recordId)) {
                    return ResponseEntity.ok(ApiResponse.success("성공(재시도)", r));
                }
            }
        }
        // 진행 중 세션이 있으면 그대로 반환
        PageResponse<PersonalAttendanceRecordDto> all = service.listAttendance(userId, null, null, null, 1000);
        for (PersonalAttendanceRecordDto r : all.getItems()) {
            if (r.getCheckOutAt() == null) {
                storeIdem(redisKey, payloadHash, r.getId());
                return ResponseEntity.ok(ApiResponse.success("성공(기존 진행 중 세션)", r));
            }
        }
        OffsetDateTime in = body != null && body.timestamp != null ? OffsetDateTime.parse(body.timestamp) : OffsetDateTime.now();
        PersonalAttendanceRecordDto created = service.seedAttendance(userId, body != null ? body.workplaceId : null, in, null, null, body != null ? body.note : null);
        storeIdem(redisKey, payloadHash, created.getId());
        return ResponseEntity.ok(ApiResponse.success("성공", created));
    }

    // 체크아웃 요청
    public static class CheckOutRequest { public Long sessionId; public String timestamp; }

    @PostMapping("/attendance/check-out")
    public ResponseEntity<ApiResponse<PersonalAttendanceRecordDto>> checkOut(@PathVariable Long userId,
                                                                             @RequestHeader(value = "Idempotency-Key", required = false) String idemKey,
                                                                             @Valid @RequestBody(required = false) CheckOutRequest body,
                                                                             HttpServletRequest request) throws JsonProcessingException {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        if (idemKey == null || idemKey.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("VALIDATION_ERROR", "Idempotency-Key 헤더가 필요합니다."));
        }
        String payloadHash = hashPayload(body);
        String redisKey = "idem:" + userId + ":" + idemKey;
        Object existing = cacheRedis.opsForValue().get(redisKey);
        if (existing != null) {
            Map stored = (Map) existing;
            String prevHash = (String) stored.get("hash");
            if (!Objects.equals(prevHash, payloadHash)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error("IDEMPOTENCY_CONFLICT", "동일 키에 상이한 요청 본문입니다."));
            }
            Long recordId = (Long) stored.get("rid");
            PageResponse<PersonalAttendanceRecordDto> page = service.listAttendance(userId, null, null, null, 1000);
            for (PersonalAttendanceRecordDto r : page.getItems()) {
                if (Objects.equals(r.getId(), recordId)) {
                    return ResponseEntity.ok(ApiResponse.success("성공(재시도)", r));
                }
            }
        }
        // 가장 최근 진행 중 세션 찾기 또는 sessionId 사용
        PageResponse<PersonalAttendanceRecordDto> all = service.listAttendance(userId, null, null, null, 1000);
        PersonalAttendanceRecordDto target = null;
        if (body != null && body.sessionId != null) {
            for (PersonalAttendanceRecordDto r : all.getItems()) {
                if (Objects.equals(r.getId(), body.sessionId)) { target = r; break; }
            }
        } else {
            for (PersonalAttendanceRecordDto r : all.getItems()) {
                if (r.getCheckOutAt() == null) { target = r; break; }
            }
        }
        if (target == null || target.getCheckOutAt() != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error("NO_ACTIVE_SESSION", "진행 중인 세션이 없습니다."));
        }
        OffsetDateTime out = (body != null && body.timestamp != null) ? OffsetDateTime.parse(body.timestamp) : OffsetDateTime.now();
        if (out.isBefore(target.getCheckInAt())) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.error("VALIDATION_ERROR", "퇴근 시간이 출근 시간보다 이전입니다."));
        }
        // DB 반영
        com.rich.sodam.personal.dto.PersonalAttendanceRecordDto updated = service.checkOut(userId, target.getId(), out);
        storeIdem(redisKey, payloadHash, updated.getId());
        return ResponseEntity.ok(ApiResponse.success("성공", updated));
    }

    // 출퇴근 기록 수정
    public static class AttendancePatchRequest { public Long workplaceId; public String note; public String checkInAt; public String checkOutAt; }

    @PatchMapping("/attendance/{attendanceId}")
    public ResponseEntity<ApiResponse<PersonalAttendanceRecordDto>> patchAttendance(@PathVariable Long userId,
                                                                                    @PathVariable Long attendanceId,
                                                                                    @Valid @RequestBody AttendancePatchRequest body,
                                                                                    HttpServletRequest request) {
        ResponseEntity<ApiResponse<?>> denied = verifyAccess(userId, request);
        if (denied != null) return (ResponseEntity) denied;
        try {
            PersonalAttendanceRecordDto updated = service.patchAttendance(
                    userId,
                    attendanceId,
                    body != null ? body.workplaceId : null,
                    body != null ? body.note : null,
                    body != null ? body.checkInAt : null,
                    body != null ? body.checkOutAt : null
            );
            return ResponseEntity.ok(ApiResponse.success("성공", updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("NOT_FOUND", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.error("VALIDATION_ERROR", e.getMessage()));
        }
    }

    private String hashPayload(Object body) throws JsonProcessingException {
        if (body == null) return "{}";
        return Integer.toHexString(objectMapper.writeValueAsString(body).hashCode());
    }

    private void storeIdem(String key, String hash, Long recordId) {
        Map<String, Object> m = new HashMap<>();
        m.put("hash", hash);
        m.put("rid", recordId);
        cacheRedis.opsForValue().set(key, m, java.time.Duration.ofHours(24));
    }
}
