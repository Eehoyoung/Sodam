package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.StoreNoticeCreateRequest;
import com.rich.sodam.dto.response.NoticeReadResponse;
import com.rich.sodam.dto.response.StoreNoticeResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.NoticeReadRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 매장 공지 + 읽음확인 (M-NEW-04/E-NEW-06) 통합 테스트.
 * 공지 생성·ack 멱등·읽음 집계(N/M)·직원 본인 readByMe·타매장 ack 차단.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreNoticeServiceTest {

    @Autowired private StoreNoticeService noticeService;
    @Autowired private NoticeReadRepository readRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    private int bizSeq = 0;

    private Store store() {
        String biz = String.format("%010d", 5556667770L + (bizSeq++));
        return storeRepository.save(new Store("공지매장", biz, "02-555-6677", "카페", 10_000, 100));
    }

    private EmployeeProfile employee(String email, String name, Store store) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(u));
        relationRepository.save(new EmployeeStoreRelation(profile, store));
        return profile;
    }

    private StoreNoticeCreateRequest req(String title, String body) {
        StoreNoticeCreateRequest r = new StoreNoticeCreateRequest();
        r.setTitle(title);
        r.setBody(body);
        return r;
    }

    @Test
    @DisplayName("사장이 공지를 올리면 저장되고 총직원수(M)가 반영된다")
    void create() {
        Store store = store();
        employee("e1@x.com", "직원1", store);
        employee("e2@x.com", "직원2", store);

        StoreNoticeResponse res = noticeService.create(store.getId(), req("오픈시간 변경", "내일부터 10시 오픈이에요."));

        assertThat(res.id()).isNotNull();
        assertThat(res.title()).isEqualTo("오픈시간 변경");
        assertThat(res.readCount()).isZero();
        assertThat(res.totalEmployees()).isEqualTo(2);
    }

    @Test
    @DisplayName("ack 는 멱등 — 같은 직원이 여러 번 눌러도 읽음 1건")
    void ackIdempotent() {
        Store store = store();
        EmployeeProfile emp = employee("e1@x.com", "직원1", store);
        StoreNoticeResponse notice = noticeService.create(store.getId(), req("공지", "본문"));

        noticeService.ack(notice.id(), emp.getId());
        noticeService.ack(notice.id(), emp.getId());
        noticeService.ack(notice.id(), emp.getId());

        assertThat(readRepository.countByNoticeId(notice.id())).isEqualTo(1);
    }

    @Test
    @DisplayName("읽음 집계: 2명 중 1명 확인 시 N=1 / M=2")
    void readAggregation() {
        Store store = store();
        EmployeeProfile e1 = employee("e1@x.com", "직원1", store);
        employee("e2@x.com", "직원2", store);
        StoreNoticeResponse notice = noticeService.create(store.getId(), req("공지", "본문"));

        noticeService.ack(notice.id(), e1.getId());

        List<StoreNoticeResponse> list = noticeService.listForStore(store.getId());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).readCount()).isEqualTo(1);
        assertThat(list.get(0).totalEmployees()).isEqualTo(2);

        List<NoticeReadResponse> reads = noticeService.readsOf(store.getId(), notice.id());
        assertThat(reads).hasSize(1);
        assertThat(reads.get(0).employeeId()).isEqualTo(e1.getId());
        assertThat(reads.get(0).employeeName()).isEqualTo("직원1");
    }

    @Test
    @DisplayName("직원 본인 공지 목록: 확인한 공지는 readByMe=true")
    void listForEmployeeReadByMe() {
        Store store = store();
        EmployeeProfile emp = employee("e1@x.com", "직원1", store);
        StoreNoticeResponse read = noticeService.create(store.getId(), req("읽을공지", "본문"));
        noticeService.create(store.getId(), req("안읽을공지", "본문"));

        noticeService.ack(read.id(), emp.getId());

        List<StoreNoticeResponse> mine = noticeService.listForEmployee(emp.getId());
        assertThat(mine).hasSize(2);
        assertThat(mine).filteredOn(n -> n.id().equals(read.id()))
                .singleElement()
                .extracting(StoreNoticeResponse::readByMe)
                .isEqualTo(true);
        assertThat(mine).filteredOn(n -> !n.id().equals(read.id()))
                .singleElement()
                .extracting(StoreNoticeResponse::readByMe)
                .isEqualTo(false);
    }

    @Test
    @DisplayName("다른 매장 직원이 ack 하면 차단(AccessDenied)")
    void ackForeignStoreBlocked() {
        Store storeA = store();
        Store storeB = store();
        EmployeeProfile outsider = employee("out@x.com", "외부직원", storeB);
        StoreNoticeResponse noticeA = noticeService.create(storeA.getId(), req("A공지", "본문"));

        assertThatThrownBy(() -> noticeService.ack(noticeA.id(), outsider.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
