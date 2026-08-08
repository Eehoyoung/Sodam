package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.dto.response.MyHistoryResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.LaborContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 본인 근무 이력 조회(WP-H) — 퇴사한 매장의 기록까지 한 화면에서 볼 수 있게 한다.
 *
 * <h3>왜 매장 스코프가 아니라 본인 스코프인가</h3>
 * <p>기존 조회 경로는 전부 {@code storeId}를 알아야 호출할 수 있어서 "내가 일했던 모든 매장"을 한 번에
 * 모으지 못한다. 개인 모드 사용자는 자기가 어느 매장 id에서 일했는지 모른다.</p>
 *
 * <p>그렇다고 퇴사자에게 매장 스코프 API를 열어주면 {@code StoreAccessGuard}가 지켜온 BOLA 방어선이
 * 무너진다. 그래서 이 서비스는 <b>요청에서 storeId를 받지 않고</b> JWT의 userId로만 필터한다 —
 * 구조적으로 타인 데이터에 닿을 수 없다. {@code StoreAccessGuard}는 건드리지 않는다.</p>
 *
 * <p>⚠️ 호출부는 반드시 {@code principal.getId()}를 넘겨야 한다. 요청 파라미터의 employeeId를 그대로
 * 넘기는 순간 이 설계의 전제가 깨진다.</p>
 */
@Service
@RequiredArgsConstructor
public class MyHistoryService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final AttendanceRepository attendanceRepository;
    private final LaborContractRepository laborContractRepository;

    @Transactional(readOnly = true)
    public MyHistoryResponse.Page<MyHistoryResponse.AttendanceItem> myAttendance(Long userId, int page, int size) {
        var result = attendanceRepository.findByEmployeeProfile_IdOrderByCheckInTimeDesc(
                userId, PageRequest.of(page, size));
        return new MyHistoryResponse.Page<>(
                result.getContent().stream().map(MyHistoryService::toAttendanceItem).toList(),
                page, size, result.getTotalElements(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public List<MyHistoryResponse.ContractItem> myContracts(Long userId) {
        return laborContractRepository.findByEmployeeIdOrderByCreatedAtDesc(userId).stream()
                .map(MyHistoryService::toContractItem)
                .toList();
    }

    /**
     * 본인 근무 이력 CSV — 보존기간 만료 고지에서 안내하는 "내려받기"의 실체다.
     * 파기되면 되돌릴 수 없으므로, 근로자가 직접 보관할 수 있어야 한다(법무·노무 공통 권고).
     *
     * <p>Excel 호환을 위해 UTF-8 BOM을 붙인다(기존 {@code ExportService} 관행과 동일).</p>
     */
    @Transactional(readOnly = true)
    public byte[] myAttendanceCsv(Long userId) {
        StringBuilder sb = new StringBuilder();
        sb.append('﻿');
        sb.append("매장,날짜,출근,퇴근,근무시간(분),적용시급\n");
        for (Attendance a : attendanceRepository.findByEmployeeProfile_IdOrderByCheckInTimeDesc(userId)) {
            sb.append(csv(storeNameOf(a))).append(',')
                    .append(a.getCheckInTime() == null ? "" : a.getCheckInTime().format(DATE)).append(',')
                    .append(a.getCheckInTime() == null ? "" : a.getCheckInTime().format(TIME)).append(',')
                    .append(a.getCheckOutTime() == null ? "" : a.getCheckOutTime().format(TIME)).append(',')
                    .append(a.getWorkingTimeInMinutes()).append(',')
                    .append(a.getAppliedHourlyWage() == null ? "" : a.getAppliedHourlyWage()).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static MyHistoryResponse.AttendanceItem toAttendanceItem(Attendance a) {
        return new MyHistoryResponse.AttendanceItem(
                a.getId(),
                storeNameOf(a),
                a.getCheckInTime() == null ? null : a.getCheckInTime().toLocalDate(),
                a.getCheckInTime(),
                a.getCheckOutTime(),
                a.getWorkingTimeInMinutes(),
                a.getAppliedHourlyWage());
        // 좌표(checkInLatitude 등)는 의도적으로 담지 않는다 — 응답·로그 모두 금지 대상이다.
    }

    private static MyHistoryResponse.ContractItem toContractItem(LaborContract c) {
        return new MyHistoryResponse.ContractItem(
                c.getId(),
                c.getStoreId(),
                c.getStartDate(),
                c.getEndDate(),
                c.getPayType() == null ? null : c.getPayType().name(),
                c.getHourlyWage(),
                c.getMonthlyBaseSalary(),
                c.getCreatedAt());
    }

    private static String storeNameOf(Attendance a) {
        return a.getStore() == null ? "" : a.getStore().getStoreName();
    }

    /** 쉼표·따옴표·줄바꿈이 들어간 매장명이 CSV 열을 깨지 않도록 인용한다. */
    private static String csv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }
}
