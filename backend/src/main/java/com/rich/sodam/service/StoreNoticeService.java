package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.NoticeRead;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StoreNotice;
import com.rich.sodam.dto.request.StoreNoticeCreateRequest;
import com.rich.sodam.dto.response.NoticeReadResponse;
import com.rich.sodam.dto.response.StoreNoticeResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.NoticeReadRepository;
import com.rich.sodam.repository.StoreNoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 매장 공지 서비스 (M-NEW-04/E-NEW-06). 단방향 공지 + 읽음확인만.
 *
 * <p>권한 검증은 컨트롤러(StoreAccessGuard)에서 수행. 직원 ack 시에는 본인이
 * 해당 공지의 매장 소속인지 서비스에서 재확인한다(공지 가로채기 방지).
 *
 * <p>알림: 공지 발행 시 매장 직원 inbox 에 적재 + 푸시(외부 발신 아닌 앱 내 알림).
 */
@Service
@RequiredArgsConstructor
public class StoreNoticeService {

    private final StoreNoticeRepository noticeRepository;
    private final NoticeReadRepository readRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final NotificationService notificationService;

    /** 사장 공지 생성 + 매장 직원들에게 알림 발행. */
    @Transactional
    public StoreNoticeResponse create(Long storeId, StoreNoticeCreateRequest req) {
        StoreNotice notice = noticeRepository.save(
                StoreNotice.create(storeId, req.getTitle(), req.getBody()));

        List<EmployeeStoreRelation> relations = activeRelations(storeId);
        String storeName = relations.stream()
                .map(EmployeeStoreRelation::getStore)
                .filter(s -> s != null)
                .map(Store::getStoreName)
                .findFirst()
                .orElse("매장");

        for (EmployeeStoreRelation rel : relations) {
            Long employeeUserId = employeeUserId(rel);
            if (employeeUserId == null) {
                continue;
            }
            notificationService.push(employeeUserId, PushMessage.builder()
                    .title("새 공지: " + notice.getTitle())
                    .body(String.format("%s 매장에 새 공지가 올라왔어요. 확인해 주세요.", storeName))
                    .deepLink("sodam://notice")
                    .data(Map.of("type", "NOTICE_POSTED"))
                    .build());
        }

        long total = relations.size();
        return StoreNoticeResponse.forOwner(notice, 0L, total);
    }

    /** 매장 공지 목록(사장) — 읽음 수(N)/총직원수(M) 포함. */
    @Transactional(readOnly = true)
    public List<StoreNoticeResponse> listForStore(Long storeId) {
        long total = activeRelations(storeId).size();
        return noticeRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(n -> StoreNoticeResponse.forOwner(n, readRepository.countByNoticeId(n.getId()), total))
                .toList();
    }

    /** 직원 본인 공지 목록 — 소속 매장 전체의 공지 + 본인 읽음 여부. */
    @Transactional(readOnly = true)
    public List<StoreNoticeResponse> listForEmployee(Long employeeId) {
        List<Long> storeIds = relationRepository.findByEmployeeProfile_Id(employeeId).stream()
                .filter(rel -> Boolean.TRUE.equals(rel.getIsActive()) && rel.getStore() != null)
                .map(rel -> rel.getStore().getId())
                .distinct()
                .toList();
        if (storeIds.isEmpty()) {
            return List.of();
        }

        List<StoreNotice> notices = noticeRepository.findByStoreIdInOrderByCreatedAtDesc(storeIds);
        List<Long> noticeIds = notices.stream().map(StoreNotice::getId).toList();
        Set<Long> readNoticeIds = readRepository.findByEmployeeIdAndNoticeIdIn(employeeId, noticeIds).stream()
                .map(NoticeRead::getNoticeId)
                .collect(Collectors.toSet());

        return notices.stream()
                .map(n -> StoreNoticeResponse.forEmployee(n, readNoticeIds.contains(n.getId())))
                .toList();
    }

    /** 직원 읽음확인(ack) — 멱등. 본인 소속 매장 공지인지 재검증. */
    @Transactional
    public void ack(Long noticeId, Long employeeId) {
        StoreNotice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("공지를 찾을 수 없어요: " + noticeId));
        if (!relationRepository.existsByEmployeeProfile_IdAndStore_Id(employeeId, notice.getStoreId())) {
            throw new AccessDeniedException("해당 매장 소속이 아니에요.");
        }
        if (readRepository.existsByNoticeIdAndEmployeeId(noticeId, employeeId)) {
            return; // 멱등: 이미 확인함
        }
        readRepository.save(NoticeRead.create(noticeId, employeeId));
    }

    /** 한 공지를 읽은 직원 목록(사장). */
    @Transactional(readOnly = true)
    public List<NoticeReadResponse> readsOf(Long storeId, Long noticeId) {
        StoreNotice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("공지를 찾을 수 없어요: " + noticeId));
        if (!notice.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 공지가 아니에요.");
        }
        Map<Long, String> nameById = activeRelations(storeId).stream()
                .map(EmployeeStoreRelation::getEmployeeProfile)
                .filter(p -> p != null && p.getId() != null)
                .collect(Collectors.toMap(EmployeeProfile::getId, this::employeeName, (a, b) -> a));

        return readRepository.findByNoticeId(noticeId).stream()
                .map(r -> new NoticeReadResponse(
                        r.getEmployeeId(),
                        nameById.getOrDefault(r.getEmployeeId(), "직원"),
                        r.getReadAt()))
                .toList();
    }

    private List<EmployeeStoreRelation> activeRelations(Long storeId) {
        return relationRepository.findByStore_Id(storeId).stream()
                .filter(rel -> Boolean.TRUE.equals(rel.getIsActive()))
                .toList();
    }

    private Long employeeUserId(EmployeeStoreRelation rel) {
        EmployeeProfile profile = rel.getEmployeeProfile();
        return profile == null ? null : profile.getId(); // EmployeeProfile.id == User.id
    }

    private String employeeName(EmployeeProfile profile) {
        if (profile.getUser() != null && profile.getUser().getName() != null) {
            return profile.getUser().getName();
        }
        return "직원";
    }
}
