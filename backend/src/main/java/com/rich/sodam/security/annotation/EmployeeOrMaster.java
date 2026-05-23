package com.rich.sodam.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 직원 또는 사장 권한 (= PERSONAL 만 거부).
 * 매장에 소속된 사용자만 접근하는 endpoint 에 사용.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('EMPLOYEE','MASTER','MANAGER','BOSS')")
public @interface EmployeeOrMaster {
}
