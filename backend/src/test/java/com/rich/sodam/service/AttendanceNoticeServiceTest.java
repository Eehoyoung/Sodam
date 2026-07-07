package com.rich.sodam.service;

import com.rich.sodam.domain.AttendanceNotice;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceNoticeType;
import com.rich.sodam.repository.AttendanceNoticeRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 직원 사전 신고(지각/조퇴/결근 예정 알림) — 저장되고 사장에게 알림이 가지만 임금에는 영향이 없다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceNoticeServiceTest {

    @Autowired private AttendanceNoticeService noticeService;
    @Autowired private AttendanceNoticeRepository noticeRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;

    @Test
    @DisplayName("사전 신고를 남기면 저장되고 사장에게 알림이 간다(임금과 무관)")
    void createsNoticeAndNotifiesMaster() {
        Store store = storeRepository.save(new Store("사전신고매장", "1231231230", "02-000-0000", "카페", 10_320, 100));
        User owner = userRepository.save(new User("owner-notice@x.com", "사장"));
        MasterProfile mp = masterProfileRepository.save(new MasterProfile(owner));
        masterStoreRelationRepository.save(new MasterStoreRelation(mp, store));

        AttendanceNotice notice = noticeService.create(
                999L, store.getId(), LocalDate.now(), AttendanceNoticeType.LATE_EXPECTED, "차가 막혀서 15분 정도 늦을 것 같아요");

        assertThat(notice.getId()).isNotNull();
        assertThat(noticeRepository.findFirstByEmployeeIdAndStoreIdAndForDateOrderByCreatedAtDesc(
                999L, store.getId(), LocalDate.now())).isPresent();
    }
}
