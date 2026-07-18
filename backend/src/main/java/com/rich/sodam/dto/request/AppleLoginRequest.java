package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Sign in with Apple 로그인 요청.
 * 카카오와 달리 FE 네이티브 SDK(@invertase/react-native-apple-authentication)가
 * 브라우저 OAuth 코드 교환 없이 서명된 identityToken 을 직접 발급하므로,
 * BE 는 그 값을 그대로 받아 서명·클레임만 검증한다.
 */
@Getter
@Setter
@NoArgsConstructor
public class AppleLoginRequest {

    /** Apple 이 발급한 서명된 identityToken(JWT) — 원문은 로그에 남기지 않는다. */
    @NotBlank
    private String identityToken;
}
