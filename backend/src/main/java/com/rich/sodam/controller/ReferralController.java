package com.rich.sodam.controller;

import com.rich.sodam.domain.Referral;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.ReferralRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 친구 추천 (Phase 2 — 보상은 SubscriptionService 와 연동 시 적용).
 */
@RestController
@RequestMapping("/api/referrals")
@RequiredArgsConstructor
@Tag(name = "친구 추천", description = "추천 코드 발급/적용/이력")
public class ReferralController {

    private final ReferralRepository referralRepository;
    private final UserRepository userRepository;

    @Operation(summary = "내 추천 코드 조회/발급",
            description = "사용자당 1개 고정 코드 발급. 영문+숫자 8자리.")
    @GetMapping("/my-code")
    @Transactional
    public ResponseEntity<Map<String, Object>> myCode(@AuthenticationPrincipal UserPrincipal principal) {
        String code = generateCodeFromUserId(principal.getId());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("referralCode", code);
        body.put("shareText", String.format(
                "소담에서 출퇴근·급여를 한 번에! 가입 시 코드 %s 입력하면 양쪽 모두 1개월 무료 받아요. https://sodam.app", code));
        return ResponseEntity.ok(body);
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ApplyReq {
        @NotBlank
        private String code;
    }

    @Operation(summary = "추천 코드 적용 (피추천자)",
            description = "회원가입 직후 또는 첫 결제 전 1회. 본인 코드 적용 불가.")
    @PostMapping("/apply")
    @Transactional
    public ResponseEntity<Map<String, String>> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody ApplyReq req) {
        Long refereeUserId = principal.getId();
        Long referrerUserId = parseCodeToUserId(req.getCode());
        if (referrerUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "올바르지 않은 추천 코드예요."));
        }
        if (referrerUserId.equals(refereeUserId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "본인 코드는 적용할 수 없어요."));
        }
        if (referralRepository.existsByReferralCodeAndReferee_Id(req.getCode(), refereeUserId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미 적용된 추천 코드예요."));
        }
        if (referralRepository.findByReferee_Id(refereeUserId).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "추천 코드는 가입당 1번만 적용할 수 있어요."));
        }

        User referrer = userRepository.findById(referrerUserId).orElse(null);
        User referee = userRepository.findById(refereeUserId).orElse(null);
        if (referrer == null || referee == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "사용자 정보를 찾을 수 없어요."));
        }
        referralRepository.save(Referral.register(req.getCode(), referrer, referee));
        return ResponseEntity.ok(Map.of("message", "추천 코드가 적용됐어요. 첫 결제 후 보상이 지급돼요."));
    }

    @Operation(summary = "내가 추천한 친구 이력")
    @GetMapping("/my-history")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> myHistory(@AuthenticationPrincipal UserPrincipal principal) {
        var list = referralRepository.findByReferrer_IdOrderByRegisteredAtDesc(principal.getId())
                .stream().map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("refereeId", r.getReferee() != null ? r.getReferee().getId() : null);
                    m.put("refereeName", r.getReferee() != null ? r.getReferee().getName() : null);
                    m.put("status", r.getStatus().name());
                    m.put("registeredAt", r.getRegisteredAt());
                    m.put("convertedAt", r.getConvertedAt());
                    return m;
                }).toList();
        return ResponseEntity.ok(list);
    }

    /** 사용자 ID 기반 결정적 8자리 코드. 외부 공유 안전. */
    private static String generateCodeFromUserId(Long userId) {
        String seed = "SODAM-REF-V1-" + userId;
        String hash = UUID.nameUUIDFromBytes(seed.getBytes()).toString()
                .replace("-", "").toUpperCase();
        return "S" + hash.substring(0, 7); // 8자리
    }

    /** 코드 → userId 역추적. 결정적이므로 가능. 무차별 추측 방지를 위해 hash 일치 검증. */
    private Long parseCodeToUserId(String code) {
        if (code == null || code.length() != 8 || !code.startsWith("S")) return null;
        // 1~1,000,000 까지 brute-force — 출시 초기에만 안전. 운영 시 별도 매핑 테이블 필요.
        // TODO[Phase 2]: 코드 매핑 테이블(ReferralCode) 신규 도입 — UUID 무작위 코드 + DB 조회로 보안 강화.
        for (long uid = 1; uid <= 1_000_000; uid++) {
            if (generateCodeFromUserId(uid).equals(code)) return uid;
        }
        return null;
    }
}
