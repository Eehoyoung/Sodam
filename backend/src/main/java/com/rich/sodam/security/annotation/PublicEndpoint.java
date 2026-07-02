package com.rich.sodam.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 비인증 접근 허용 (login, webhook, 정적 콘텐츠 등).
 * SecurityConfig 의 permitAll 매칭과 일관성 유지를 위한 명시적 마커.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("permitAll()")
public @interface PublicEndpoint {
}
