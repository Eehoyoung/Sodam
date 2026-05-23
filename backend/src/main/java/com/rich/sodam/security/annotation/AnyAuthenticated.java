package com.rich.sodam.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 인증된 모든 사용자 허용 (PERSONAL 포함).
 * 주로 본인 프로필 조회, 가입 후 역할 선택 같은 endpoint.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("isAuthenticated()")
public @interface AnyAuthenticated {
}
