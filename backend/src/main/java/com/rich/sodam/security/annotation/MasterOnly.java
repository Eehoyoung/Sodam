package com.rich.sodam.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 사장(MASTER/MANAGER/BOSS) 권한만 접근 허용.
 * 클래스 또는 메서드 레벨에 사용.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('MASTER','MANAGER','BOSS')")
public @interface MasterOnly {
}
