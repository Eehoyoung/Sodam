package com.rich.sodam.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 사업주(MASTER) 전용 권한.
 * 매니저는 전역 역할로 우회하지 않고 매장 관계 기반 permission guard로 별도 허용한다.
 * 클래스 또는 메서드 레벨에 사용.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('MASTER')")
public @interface MasterOnly {
}
