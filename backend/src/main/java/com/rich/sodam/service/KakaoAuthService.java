package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.kakaoAuth.KakaoProfile;
import com.rich.sodam.security.kakaoAuth.OAuthToken;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

/**
 * 카카오 OAuth 인증 처리를 위한 서비스 클래스
 */
@Service
@RequiredArgsConstructor
@Transactional
public class KakaoAuthService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(KakaoAuthService.class);

    private final UserRepository userRepository;

    @Value("${spring.security.oauth2.client.registration.kakao.client-secret}")
    private String clientSecret;

    /**
     * 카카오 프로필에서 이메일을 추출합니다.
     *
     * @param kakaoProfile 카카오 프로필 객체
     * @return 사용자 이메일
     * @throws RuntimeException 이메일을 찾을 수 없는 경우
     */
    private static String getEmail(KakaoProfile kakaoProfile) {
        if (kakaoProfile == null) {
            throw new RuntimeException("카카오 프로필 정보를 가져오지 못했습니다.");
        }

        KakaoProfile.KakaoAccount kakaoAccount = kakaoProfile.getKakaoAccount();

        if (kakaoAccount == null || kakaoAccount.getEmail() == null) {
            throw new RuntimeException("카카오 계정 정보 또는 이메일이 없습니다.");
        }

        return kakaoAccount.getEmail();
    }

    /**
     * 인증 코드를 이용하여 카카오 액세스 토큰을 획득합니다.
     *
     * @param code        인증 코드
     * @param redirectUri 리다이렉트 URI
     * @param clientId    클라이언트 ID
     * @return 카카오 액세스 토큰
     */
    public String getAccessToken(String code, String redirectUri, String clientId) {
        OAuthToken oauthToken = getOauthToken(code, redirectUri, clientId);
        return oauthToken.getAccessToken();
    }

    /**
     * 인증 코드를 이용하여 OAuth 토큰을 획득합니다.
     *
     * @param code        인증 코드
     * @param redirectUri 리다이렉트 URI
     * @param clientId    클라이언트 ID
     * @return OAuth 토큰 객체
     */
    private OAuthToken getOauthToken(String code, String redirectUri, String clientId) {
        String tokenUrl = "https://kauth.kakao.com/oauth/token";
        String grantType = "authorization_code";

        RestTemplate restTemplate = new RestTemplate();

        MultiValueMap<String, String> paramMap = new LinkedMultiValueMap<>();
        paramMap.add("grant_type", grantType);
        paramMap.add("client_id", clientId);
        paramMap.add("redirect_uri", redirectUri);
        paramMap.add("code", code);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(paramMap, headers);
        ResponseEntity<OAuthToken> responseEntity = restTemplate.postForEntity(tokenUrl, request, OAuthToken.class);

        return responseEntity.getBody();
    }

    /**
     * 액세스 토큰을 이용하여 인증된 사용자 정보를 획득합니다.
     *
     * @param accessToken 카카오 액세스 토큰
     * @return 인증된 사용자 객체
     */
    @Transactional
    public User getAuthenticatedUser(String accessToken) {
        KakaoProfile kakaoProfile = getKakaoProfile(accessToken);
        return saveKakaoUserInfo(kakaoProfile);
    }

    /**
     * 액세스 토큰을 이용하여 카카오 프로필 정보를 가져옵니다.
     *
     * @param accessToken 카카오 액세스 토큰
     * @return 카카오 프로필 객체
     */
    public KakaoProfile getKakaoProfile(String accessToken) {
        String profileUrl = "https://kapi.kakao.com/v2/user/me";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);

        RestTemplate restTemplate = new RestTemplate();
        HttpEntity<HttpHeaders> requestEntity = new HttpEntity<>(headers);
        ResponseEntity<KakaoProfile> responseEntity = restTemplate.exchange(
                profileUrl, HttpMethod.GET, requestEntity, KakaoProfile.class);

        log.debug("요청 헤더: {}", headers);
        log.debug("응답 바디: {}", responseEntity.getBody());

        return responseEntity.getBody();
    }

    /**
     * 카카오 프로필 정보를 사용하여 사용자 정보를 저장합니다.
     *
     * @param kakaoProfile 카카오 프로필 객체
     * @return 저장된 사용자 객체
     */
    @Transactional
    public User saveKakaoUserInfo(KakaoProfile kakaoProfile) {
        try {
            String email = getEmail(kakaoProfile);

            log.debug("카카오 사용자 이메일: {}", email);

            // 이미 가입된 사용자인지 확인
            Optional<User> optionalUser = userRepository.findByEmail(email);

            // 이미 가입된 사용자라면 리턴
            if (optionalUser.isPresent()) {
                log.debug("기존 사용자 발견: {}", optionalUser.get().getId());
                return optionalUser.get();
            }

            // 새 사용자 생성
            User newUser = new User();
            newUser.setEmail(email);

            // 닉네임 설정
            if (kakaoProfile.getProperties() != null && kakaoProfile.getProperties().getNickname() != null) {
                newUser.setName("kakao_" + kakaoProfile.getProperties().getNickname());
            } else {
                newUser.setName("kakao_user_" + UUID.randomUUID().toString().substring(0, 8));
            }

            newUser.setUserGrade(UserGrade.NORMAL);

            User savedUser = userRepository.save(newUser);
            log.info("신규 사용자 등록 완료 - ID: {}", savedUser.getId());

            return savedUser;
        } catch (Exception e) {
            log.error("사용자 저장 중 오류 발생: {}", e.getMessage(), e);
            throw e;
        }
    }
}