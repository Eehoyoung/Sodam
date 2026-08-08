package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.MyHistoryResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-H — 본인 스코프 근무 이력 조회 검증.
 *
 * <p>두 가지가 핵심이다. <b>퇴사한 매장의 기록이 계속 보이는가</b>(데이터 연속성), 그리고
 * <b>타인의 기록이 절대 섞이지 않는가</b>(BOLA). 후자는 이 API가 storeId를 받지 않는 설계의 근거다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MyHistoryServiceTest {

    private static final AtomicInteger SEQ = new AtomicInteger(0);

    @Autowired private MyHistoryService myHistoryService;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private LaborContractRepository laborContractRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;

    private record Person(Long userId, Long storeId, String storeName) {
    }

    /** 직원 1명 + 매장 1곳 + 출퇴근 {@code attendanceCount}건 + 근로계약 1건. */
    private Person createEmployeeWithRecords(int attendanceCount, boolean terminated) throws Exception {
        int n = SEQ.incrementAndGet();

        User user = new User("myhistory" + n + "@example.com", "이력직원" + n);
        user.setUserGrade(UserGrade.EMPLOYEE);
        user = userRepository.saveAndFlush(user);

        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(user));
        String storeName = "이력매장" + n;
        Store store = storeRepository.save(
                new Store(storeName, String.format("%010d", 6_000_000_000L + n), "02-000-0000", "카페", 12_000, 100));

        EmployeeStoreRelation relation = relationRepository.save(new EmployeeStoreRelation(profile, store, 12_000));
        if (terminated) {
            relation.changeActive(false);
            Field f = relation.getClass().getDeclaredField("deactivatedAt");
            f.setAccessible(true);
            f.set(relation, LocalDateTime.now().minusYears(1));
            relationRepository.saveAndFlush(relation);
        }

        for (int i = 0; i < attendanceCount; i++) {
            Attendance a = new Attendance(profile, store);
            a.checkIn(37.0, 127.0, 12_000);
            attendanceRepository.saveAndFlush(a);
        }

        LaborContract contract = new LaborContract();
        contract.setEmployeeId(profile.getId());
        contract.setStoreId(store.getId());
        contract.setStartDate(LocalDate.now().minusYears(2));
        contract.setHourlyWage(12_000);
        laborContractRepository.saveAndFlush(contract);

        return new Person(user.getId(), store.getId(), storeName);
    }

    @Test
    @DisplayName("퇴사한 매장의 출퇴근 기록도 본인 이력에 계속 보인다")
    void terminatedStoreRecordsRemainVisible() throws Exception {
        Person me = createEmployeeWithRecords(3, true);

        var page = myHistoryService.myAttendance(me.userId(), 0, 30);

        assertThat(page.items()).hasSize(3);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.items()).allSatisfy(item ->
                assertThat(item.storeName()).isEqualTo(me.storeName()));
    }

    @Test
    @DisplayName("타인의 기록은 절대 섞이지 않는다 — storeId를 받지 않는 설계의 근거")
    void otherPeopleRecordsAreNeverIncluded() throws Exception {
        Person me = createEmployeeWithRecords(2, false);
        Person other = createEmployeeWithRecords(5, false);

        var mine = myHistoryService.myAttendance(me.userId(), 0, 100);
        var theirs = myHistoryService.myAttendance(other.userId(), 0, 100);

        assertThat(mine.items()).hasSize(2);
        assertThat(theirs.items()).hasSize(5);
        assertThat(mine.items()).noneSatisfy(item ->
                assertThat(item.storeName()).isEqualTo(other.storeName()));

        assertThat(myHistoryService.myContracts(me.userId()))
                .hasSize(1)
                .allSatisfy(c -> assertThat(c.storeId()).isEqualTo(me.storeId()));
    }

    @Test
    @DisplayName("응답에 GPS 좌표가 포함되지 않는다")
    void responseNeverExposesCoordinates() throws Exception {
        Person me = createEmployeeWithRecords(1, false);

        MyHistoryResponse.AttendanceItem item =
                myHistoryService.myAttendance(me.userId(), 0, 30).items().get(0);

        assertThat(item.getClass().getRecordComponents())
                .extracting(java.lang.reflect.RecordComponent::getName)
                .doesNotContain("checkInLatitude", "checkInLongitude", "latitude", "longitude");
    }

    @Test
    @DisplayName("CSV 내려받기는 본인 기록만 담고 Excel 호환 BOM으로 시작한다")
    void csvContainsOnlyOwnRecords() throws Exception {
        Person me = createEmployeeWithRecords(2, true);
        Person other = createEmployeeWithRecords(3, false);

        String csv = new String(myHistoryService.myAttendanceCsv(me.userId()), StandardCharsets.UTF_8);

        assertThat(csv).startsWith("﻿");
        assertThat(csv).contains(me.storeName());
        assertThat(csv).doesNotContain(other.storeName());
        // 헤더 1줄 + 본인 기록 2줄
        assertThat(csv.lines()).hasSize(3);
    }

    @Test
    @DisplayName("기록이 없는 사용자는 빈 결과를 받는다")
    void userWithoutRecordsGetsEmptyResult() throws Exception {
        User loner = new User("myhistory_empty" + SEQ.incrementAndGet() + "@example.com", "무기록");
        loner.setUserGrade(UserGrade.EMPLOYEE);
        loner = userRepository.saveAndFlush(loner);
        employeeProfileRepository.save(new EmployeeProfile(loner));

        var page = myHistoryService.myAttendance(loner.getId(), 0, 30);

        assertThat(page.items()).isEmpty();
        assertThat(page.hasNext()).isFalse();
        assertThat(myHistoryService.myContracts(loner.getId())).isEmpty();
    }
}
