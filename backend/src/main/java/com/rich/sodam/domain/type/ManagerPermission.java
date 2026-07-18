package com.rich.sodam.domain.type;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

public enum ManagerPermission {
    ATTENDANCE_APPROVE,
    SCHEDULE_MANAGE,
    TIMEOFF_APPROVE,
    STAFF_VIEW,
    /** 대타 모집 + 매장 공지(StoreNoticeController)를 함께 묶은 권한 — 별도 분리하지 않음(FE 라벨: "대타·공지 관리"). */
    SUBSTITUTE_MANAGE,
    DASHBOARD_VIEW,
    RECRUITMENT_MANAGE,
    PAYROLL_VIEW,
    PAYROLL_CONFIRM,
    WAGE_EDIT,
    STAFF_DEACTIVATE,
    CONTRACT_MANAGE,
    STORE_EDIT;

    private static final Set<ManagerPermission> DEFAULT_PRESET = Collections.unmodifiableSet(
            EnumSet.of(ATTENDANCE_APPROVE, SCHEDULE_MANAGE, TIMEOFF_APPROVE,
                    STAFF_VIEW, SUBSTITUTE_MANAGE, DASHBOARD_VIEW));

    public static Set<ManagerPermission> defaultPreset() {
        return EnumSet.copyOf(DEFAULT_PRESET);
    }
}
