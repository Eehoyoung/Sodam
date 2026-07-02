package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeDocument;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.repository.EmployeeDocumentRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * 서류 만료 경보 스케줄러 (A5). 매일 09:00 보건증 등 만료 임박 서류를 스캔해 사장에게 알림.
 *
 * <p>스팸 방지: D-30 / D-7 / D-1 임계일에만 발송. {@code expiryTracked} 종류(보건증 등)만 대상.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentExpiryScheduler {

    /** 알림 발송 임계일(만료까지 남은 일수). */
    private static final Set<Long> NOTIFY_DAYS = Set.of(30L, 7L, 1L);
    private static final int SCAN_HORIZON_DAYS = 30;

    private final EmployeeDocumentRepository documentRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void scanExpiringDocuments() {
        LocalDate today = LocalDate.now();
        List<EmployeeDocument> docs =
                documentRepository.findByExpiresAtLessThanEqual(today.plusDays(SCAN_HORIZON_DAYS));

        int notified = 0;
        for (EmployeeDocument d : docs) {
            if (d.getType() == null || !d.getType().isExpiryTracked()) {
                continue;
            }
            Long daysLeft = d.daysUntilExpiry(today);
            if (daysLeft == null || !NOTIFY_DAYS.contains(daysLeft)) {
                continue;
            }
            String employeeName = resolveEmployeeName(d.getEmployeeId());
            for (MasterStoreRelation rel : masterStoreRelationRepository.findByStore_Id(d.getStoreId())) {
                Long ownerUserId = rel.getMasterProfile() != null ? rel.getMasterProfile().getId() : null;
                if (ownerUserId != null) {
                    notificationService.notifyDocumentExpiring(
                            ownerUserId, employeeName, d.getType().getLabel(), daysLeft);
                    notified++;
                }
            }
        }
        if (notified > 0) {
            log.info("서류 만료 경보 발송 {}건", notified);
        }
    }

    private String resolveEmployeeName(Long employeeId) {
        return employeeProfileRepository.findById(employeeId)
                .map(e -> e.getUser() != null ? e.getUser().getName() : null)
                .filter(n -> n != null && !n.isBlank())
                .orElse("직원");
    }
}
