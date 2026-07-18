package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Sign in with Apple 인증 처리를 위한 서비스 클래스.
 * <p>
 * 카카오와 근본적으로 흐름이 다르다 — 카카오는 브라우저 OAuth 코드 교환(인가코드→액세스토큰→프로필조회)이
 * 필요하지만, Apple 은 FE 네이티브 SDK 가 이미 서명된 identityToken(JWT)을 직접 반환하므로
 * BE 는 그 서명(JWKS)과 iss/aud 클레임만 검증하면 된다.
 * <p>
 * 이메일만으로 사용자를 매칭하는 카카오 방식과 달리, Apple 의 identityToken 은 재로그인 시
 * email 클레임을 재전송하지 않을 수 있다(이메일 가리기 릴레이 사용 시 특히). 그래서 Apple 의 sub
 * 클레임(앱+사용자 조합의 안정적 불변 식별자)을 {@link User#getAppleSub()} 로 저장해 기본 조회 키로 쓴다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AppleAuthService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AppleAuthService.class);

    /** Apple 이 발급하는 identityToken 의 고정 issuer. */
    private static final String APPLE_ISSUER = "https://appleid.apple.com";

    private final JwtDecoder appleJwtDecoder;
    private final UserRepository userRepository;
    private final IntegrationProperties integrationProperties;

    /**
     * identityToken 을 검증하고 대응하는 사용자를 조회/생성합니다.
     *
     * @param identityToken Apple 네이티브 SDK 가 발급한 서명된 JWT
     * @return 인증된(또는 신규 생성된) 사용자
     * @throws RuntimeException 서명/클레임 검증 실패, 또는 신규 유저를 생성할 수 없는 경우
     */
    @Transactional
    public User authenticate(String identityToken) {
        Jwt jwt = verifyIdentityToken(identityToken);
        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        return findOrCreateUser(sub, email);
    }

    /**
     * identityToken 의 서명(JWKS)·iss·aud 클레임을 검증합니다.
     * 서명·타임스탬프(exp/nbf) 검증은 {@link JwtDecoder} 기본 검증기가 수행하고,
     * iss/aud 는 기본 검증기가 확인하지 않으므로 여기서 별도로 확인한다.
     */
    private Jwt verifyIdentityToken(String identityToken) {
        Jwt jwt;
        try {
            jwt = appleJwtDecoder.decode(identityToken);
        } catch (JwtException e) {
            // 보안: identityToken 원문은 PII/시크릿에 준하므로 로그에 남기지 않는다.
            log.warn("Apple identityToken 서명/타임스탬프 검증 실패: {}", e.getMessage());
            throw new RuntimeException("Apple 로그인 토큰 검증에 실패했습니다.", e);
        }

        String issuer = jwt.getClaimAsString("iss");
        if (!APPLE_ISSUER.equals(issuer)) {
            log.warn("Apple identityToken issuer 불일치");
            throw new RuntimeException("Apple 로그인 토큰의 발급자가 올바르지 않습니다.");
        }

        String clientId = integrationProperties.getApple().getClientId();
        List<String> audiences = jwt.getAudience();
        if (clientId == null || clientId.isBlank() || audiences == null || !audiences.contains(clientId)) {
            log.warn("Apple identityToken audience 불일치");
            throw new RuntimeException("Apple 로그인 토큰의 대상(aud)이 올바르지 않습니다.");
        }

        return jwt;
    }

    /**
     * appleSub 기준으로 우선 조회하고, 없으면 email 로 기존 계정(카카오/이메일 가입 등)과 연결(appleSub 부여)한다.
     * 그마저 없는 완전 신규 사용자는 email 이 있어야만 생성 가능하다(User.email 은 NOT NULL 제약).
     *
     * @param sub   Apple sub 클레임 (필수)
     * @param email Apple email 클레임 (최초 인가 시에만 안정적으로 포함, 이후 재로그인엔 없을 수 있음)
     */
    @Transactional
    public User findOrCreateUser(String sub, String email) {
        if (sub == null || sub.isBlank()) {
            throw new RuntimeException("Apple 인증 정보가 올바르지 않습니다.");
        }

        Optional<User> bySub = userRepository.findByAppleSub(sub);
        if (bySub.isPresent()) {
            log.debug("Apple 기존 사용자 재로그인 - ID: {}", bySub.get().getId());
            return bySub.get();
        }

        if (email != null && !email.isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User existing = byEmail.get();
                existing.setAppleSub(sub);
                log.info("기존 계정에 Apple 계정 연결 완료 - ID: {}", existing.getId());
                return existing;
            }

            User newUser = new User();
            newUser.setEmail(email);
            newUser.setAppleSub(sub);
            newUser.setName("apple_user_" + UUID.randomUUID().toString().substring(0, 8));
            newUser.setUserGrade(UserGrade.Personal);

            // ⚠️ 카카오와 동일: 소셜 가입은 동의 없이 계정만 생성된다. 필수 동의(이용약관·개인정보·만14세)는
            // 로그인 후 동의 화면에서 수집해야 한다. hasCompletedRequiredConsents()==false 상태로 생성.
            User savedUser = userRepository.save(newUser);
            log.info("Apple 신규 사용자 등록 완료(동의 미수집, 후속 수집 필요) - ID: {}", savedUser.getId());
            return savedUser;
        }

        // 방어적 처리 — Apple 공식 동작상 최초 인가 시엔 항상 email 클레임을 포함하므로
        // 신규 사용자인데 email 이 없는 경우는 사실상 발생하지 않는다.
        log.error("Apple 신규 사용자 생성 불가 - email 클레임 없음");
        throw new RuntimeException("Apple 로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
    }
}
