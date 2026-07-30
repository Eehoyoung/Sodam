package com.rich.sodam.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 서버 설정의 전역 콘텐츠 운영자 허용 목록에 있는 사용자만 허용한다.
 * 매장 역할이나 클라이언트가 보낸 사용자 ID·역할 값은 권한 근거로 사용하지 않는다.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@systemContentAdminAuthorizer.canManage(authentication)")
public @interface SystemContentAdminOnly {
}
