package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.AttendanceNotice;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.AttendanceNoticeType;
import com.rich.sodam.repository.AttendanceNoticeRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 직원의 지각/조퇴/결근 사전 신고 — 사장에게 알리는 용도일 뿐 임금 계산에는 영향을 주지 않는다.
 * 실제 처리(공제/공제안함/연차전환)는 사후에 {@link AttendanceIrregularityService}가 담당한다.
 */
@Service
@RequiredArgsConstructor
public class AttendanceNoticeService {

    private final AttendanceNoticeRepository noticeRepository;
    private final StoreRepository storeRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public AttendanceNotice create(Long employeeId, Long storeId, LocalDate forDate,
                                    AttendanceNoticeType type, String message) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없어요."));
        AttendanceNotice notice = noticeRepository.save(
                AttendanceNotice.create(employeeId, storeId, forDate, type, message));
        notifyMasters(notice, store);
        return notice;
    }

    private void notifyMasters(AttendanceNotice notice, Store store) {
        String employeeName = userRepository.findById(notice.getEmployeeId())
                .map(u -> u.getName()).orElse("직원");
        String typeLabel = switch (notice.getType()) {
            case LATE_EXPECTED -> "지각";
            case EARLY_LEAVE_EXPECTED -> "조퇴";
            case ABSENCE_EXPECTED -> "결근";
        };
        String storeName = store.getStoreName() != null ? store.getStoreName() : "매장";
        for (MasterStoreRelation rel : masterStoreRelationRepository.findByStore_Id(store.getId())) {
            if (rel.getMasterProfile() == null || rel.getMasterProfile().getUser() == null) {
                continue;
            }
            notificationService.push(rel.getMasterProfile().getUser().getId(), PushMessage.builder()
                    .title(String.format("%s %s 사전 신고", employeeName, typeLabel))
                    .body(notice.getMessage() != null && !notice.getMessage().isBlank()
                            ? notice.getMessage()
                            : String.format("%s님이 %s(%s) %s 예정을 알려왔어요.", employeeName, storeName, notice.getForDate(), typeLabel))
                    .deepLink("sodam://attendance")
                    .data(Map.of("type", "ATTENDANCE_NOTICE"))
                    .build());
        }
    }
}
