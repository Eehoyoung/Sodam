package com.rich.sodam.security.authorization;

import com.rich.sodam.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 전역 안내 콘텐츠(노무·세무·정책·팁·Q&A 관리)를 운영할 수 있는 서버 측 계정 허용 목록.
 *
 * <p>매장 소유자(MASTER)는 시스템 운영자가 아니므로 이 권한을 자동으로 얻지 않는다.
 * 허용 목록이 비어 있으면 실패 폐쇄(fail-closed)로 모든 전역 콘텐츠 쓰기를 거부한다.</p>
 */
@Component("systemContentAdminAuthorizer")
public class SystemContentAdminAuthorizer {

    private final Set<Long> adminUserIds;

    public SystemContentAdminAuthorizer(
            @Value("${sodam.security.system-content.admin-user-ids:}") String adminUserIdsCsv) {
        this.adminUserIds = parseAdminUserIds(adminUserIdsCsv);
    }

    public boolean canManage(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (!(authentication.getPrincipal() instanceof UserPrincipal principal)
                || principal.getId() == null) {
            return false;
        }
        return adminUserIds.contains(principal.getId());
    }

    private Set<Long> parseAdminUserIds(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptySet();
        }

        Set<Long> ids = new LinkedHashSet<>();
        Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .forEach(value -> {
                    try {
                        ids.add(Long.parseLong(value));
                    } catch (NumberFormatException e) {
                        throw new IllegalStateException(
                                "sodam.security.system-content.admin-user-ids must contain numeric user IDs only", e);
                    }
                });
        return Collections.unmodifiableSet(ids);
    }
}
