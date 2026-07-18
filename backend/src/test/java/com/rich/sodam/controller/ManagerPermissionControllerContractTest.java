package com.rich.sodam.controller;

import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ManagerPermissionControllerContractTest {
    @Test
    void onlyClassifiedPhase2MethodsAreOpenedToEmployeeRoleBeforeRelationGuard() throws Exception {
        List<MethodRef> opened = List.of(
                ref(AttendanceApprovalController.class, "listForStore"),
                ref(AttendanceApprovalController.class, "approve"),
                ref(AttendanceApprovalController.class, "reject"),
                ref(AttendanceCorrectionController.class, "approve"),
                ref(AttendanceCorrectionController.class, "reject"),
                ref(AttendanceIrregularityController.class, "list"),
                ref(AttendanceIrregularityController.class, "waive"),
                ref(AttendanceIrregularityController.class, "deduct"),
                ref(AttendanceIrregularityController.class, "convertToLeave"),
                ref(WorkShiftController.class, "create"),
                ref(WorkShiftController.class, "listForStore"),
                ref(WorkShiftController.class, "notifyConfirmed"),
                ref(WorkShiftController.class, "update"),
                ref(WorkShiftController.class, "delete"),
                ref(ShiftTemplateController.class, "create"),
                ref(ShiftTemplateController.class, "list"),
                ref(ShiftTemplateController.class, "get"),
                ref(ShiftTemplateController.class, "apply"),
                ref(ShiftTemplateController.class, "delete"),
                ref(TimeOffController.class, "getTimeOffsByStore"),
                ref(TimeOffController.class, "getTimeOffsByStoreAndStatus"),
                ref(TimeOffController.class, "approveTimeOff"),
                ref(TimeOffController.class, "rejectTimeOff"),
                ref(ShiftSwapController.class, "create"),
                ref(ShiftSwapController.class, "approve"),
                ref(ShiftSwapController.class, "cancel"),
                ref(StoreNoticeController.class, "create"),
                ref(StoreNoticeController.class, "listForStore"),
                ref(StoreNoticeController.class, "reads"),
                ref(StoreStatsController.class, "today"),
                ref(StoreInsightsController.class, "weekly"),
                ref(StoreQueryController.class, "countActiveEmployees"),
                ref(StoreQueryController.class, "countAttendance"),
                ref(StoreQueryController.class, "findLastActivity"),
                ref(StoreController.class, "getEmployeesByStore"));

        for (MethodRef ref : opened) {
            assertThat(effectiveEmployeeOrMaster(ref.type(), ref.method()))
                    .as(ref.type().getSimpleName() + "#" + ref.method().getName())
                    .isTrue();
            assertThat(ref.method().isAnnotationPresent(MasterOnly.class)).isFalse();
        }
    }

    @Test
    void payrollDashboardAndOwnerOnlyStoreQueriesRemainMasterOnly() throws Exception {
        for (MethodRef ref : List.of(
                ref(StoreStatsController.class, "monthToDate"),
                ref(StoreStatsController.class, "dashboard"),
                ref(StoreQueryController.class, "countPayroll"),
                ref(StoreQueryController.class, "countUnpaidPayroll"),
                ref(StoreQueryController.class, "findActiveById"))) {
            assertThat(ref.method().isAnnotationPresent(MasterOnly.class))
                    .as(ref.type().getSimpleName() + "#" + ref.method().getName())
                    .isTrue();
        }
    }

    private boolean effectiveEmployeeOrMaster(Class<?> type, Method method) {
        return method.isAnnotationPresent(EmployeeOrMaster.class)
                || type.isAnnotationPresent(EmployeeOrMaster.class);
    }

    private MethodRef ref(Class<?> type, String methodName) {
        Method method = java.util.Arrays.stream(type.getDeclaredMethods())
                .filter(m -> m.getName().equals(methodName)).findFirst().orElseThrow();
        return new MethodRef(type, method);
    }

    private record MethodRef(Class<?> type, Method method) {}
}
