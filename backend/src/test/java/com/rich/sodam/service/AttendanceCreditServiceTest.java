package com.rich.sodam.service;

import com.rich.sodam.config.AttendanceCreditProperties;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditCheckIn;
import com.rich.sodam.domain.AttendanceCreditTransaction;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditTransactionReason;
import com.rich.sodam.domain.type.AttendanceCreditTransactionType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.AttendanceCreditCheckInResponse;
import com.rich.sodam.dto.response.AttendanceCreditSummaryResponse;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.InsufficientCreditException;
import com.rich.sodam.repository.AttendanceCreditCheckInRepository;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceCreditTransactionRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 출근권(AttendanceCredit) 서비스 테스트 — 지급(요일별)·7일 스트릭 보너스·중복 체크인 방지·소모
 * (잔액 충분/부족)·만료(lazy 판정)·낙관적 락 동시성(recruitment-monetization-gamification-plan.md §2, §5).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceCreditServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Autowired private AttendanceCreditService service;
    @Autowired private AttendanceCreditRepository walletRepo;
    @Autowired private AttendanceCreditTransactionRepository transactionRepo;
    @Autowired private AttendanceCreditCheckInRepository checkInRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private AttendanceCreditProperties properties;

    private int emailSeq = 0;

    private User masterUser() {
        User u = new User("attendance_credit_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    /**
     * 잔액과 이를 뒷받침하는 무기한 TOPUP lot을 함께 만든다. 실제 소모(FIFO)는 잔액 컬럼이 아니라
     * 원장 lot(remainingQuantity)에서 끌어오므로, lot 없이 잔액만 채우면 소모 시 "정합성 오류"가 난다
     * (AttendanceCreditService 설계 노트 참고).
     */
    private AttendanceCredit grantCredits(User owner, int amount) {
        AttendanceCredit wallet = AttendanceCredit.openFor(owner.getId());
        ReflectionTestUtils.setField(wallet, "balance", amount);
        wallet = walletRepo.save(wallet);
        if (amount > 0) {
            transactionRepo.save(AttendanceCreditTransaction.supply(owner.getId(),
                    AttendanceCreditTransactionType.TOPUP, AttendanceCreditTransactionReason.IAP_TOPUP,
                    amount, null, LocalDateTime.now(SEOUL)));
        }
        return wallet;
    }

    // ─────────────────────────────────────────────────────────────────
    // 출석체크 — 요일별 지급 수량
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("출석체크 — 요일에 맞는 설정값(평일/주말)만큼 지급되고 연속 출석일수가 1이 된다")
    void checkIn_grantsAmountForToday() {
        User owner = masterUser();

        AttendanceCreditCheckInResponse response = service.checkIn(owner.getId());

        LocalDate today = LocalDate.now(SEOUL);
        int expected = isWeekendGrantDay(today) ? properties.getWeekendGrant() : properties.getWeekdayGrant();

        assertThat(response.grantedQuantity()).isEqualTo(expected);
        assertThat(response.balance()).isEqualTo(expected);
        assertThat(response.currentStreak()).isEqualTo(1);
        assertThat(response.streakBonusGranted()).isFalse();
    }

    @Test
    @DisplayName("오늘 이미 체크인했으면 재체크인 시 409")
    void checkIn_duplicateSameDay_throwsConflict() {
        User owner = masterUser();
        service.checkIn(owner.getId());

        assertThatThrownBy(() -> service.checkIn(owner.getId()))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getErrorCode())
                        .isEqualTo("ATTENDANCE_CREDIT_ALREADY_CHECKED_IN"));
    }

    @Test
    @DisplayName("7일 연속 출석 달성 시 보너스 즉시 지급 — 지갑/로그에 지난 6일 이력을 직접 구성한 뒤 7일째를 체크인한다")
    void checkIn_sevenDayStreak_grantsBonus() {
        User owner = masterUser();
        LocalDate today = LocalDate.now(SEOUL);

        // 실제 서비스는 매 호출마다 "오늘" 날짜로만 체크인하므로(시계 조작 없이는 진짜 연속 6일을
        // 재현할 수 없다), 지난 6일의 이력(지갑 스트릭 + 로그)을 직접 구성해 "7일째 체크인"만
        // service.checkIn()으로 실행한다.
        AttendanceCredit wallet = AttendanceCredit.openFor(owner.getId());
        ReflectionTestUtils.setField(wallet, "currentStreak", 6);
        ReflectionTestUtils.setField(wallet, "lastCheckInDate", today.minusDays(1));
        walletRepo.save(wallet);
        for (int daysAgo = 1; daysAgo <= 6; daysAgo++) {
            checkInRepo.save(AttendanceCreditCheckIn.of(owner.getId(), today.minusDays(daysAgo),
                    properties.getWeekdayGrant(), false, LocalDateTime.now(SEOUL)));
        }

        AttendanceCreditCheckInResponse seventh = service.checkIn(owner.getId());

        assertThat(seventh.currentStreak()).isEqualTo(7);
        assertThat(seventh.streakBonusGranted()).isTrue();
        assertThat(seventh.streakBonusQuantity()).isEqualTo(properties.getStreakBonusQuantity());
    }

    @Test
    @DisplayName("스트릭이 하루라도 끊기면 다음 체크인은 1로 리셋된다")
    void checkIn_afterGap_resetsStreakToOne() {
        User owner = masterUser();
        LocalDate today = LocalDate.now(SEOUL);

        AttendanceCredit wallet = AttendanceCredit.openFor(owner.getId());
        ReflectionTestUtils.setField(wallet, "currentStreak", 5);
        ReflectionTestUtils.setField(wallet, "lastCheckInDate", today.minusDays(2)); // 하루 빠짐(그저께가 마지막)
        walletRepo.save(wallet);

        AttendanceCreditCheckInResponse afterGap = service.checkIn(owner.getId());

        assertThat(afterGap.currentStreak()).isEqualTo(1);
        assertThat(afterGap.streakBonusGranted()).isFalse();
    }

    // ─────────────────────────────────────────────────────────────────
    // 잔액 조회 — 이번 주 소멸 예정, 그리드
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("체크인 없는 사장의 요약 조회 — 잔액 0, 그리드 전부 미체크")
    void getSummary_neverCheckedIn_returnsZero() {
        User owner = masterUser();

        AttendanceCreditSummaryResponse summary = service.getSummary(owner.getId());

        assertThat(summary.balance()).isZero();
        assertThat(summary.currentStreak()).isZero();
        assertThat(summary.checkedInToday()).isFalse();
        assertThat(summary.weeklyGrid()).hasSize(7);
        assertThat(summary.weeklyGrid()).allMatch(day -> !day.checkedIn());
    }

    @Test
    @DisplayName("체크인 후 요약 조회 — checkedInToday=true, 오늘 칸만 체크됨")
    void getSummary_afterCheckIn_reflectsToday() {
        User owner = masterUser();
        service.checkIn(owner.getId());

        AttendanceCreditSummaryResponse summary = service.getSummary(owner.getId());

        assertThat(summary.checkedInToday()).isTrue();
        assertThat(summary.balance()).isGreaterThan(0);
        LocalDate today = LocalDate.now(SEOUL);
        assertThat(summary.weeklyGrid().stream().filter(d -> d.date().equals(today)).findFirst().orElseThrow().checkedIn())
                .isTrue();
    }

    @Test
    @DisplayName("이번 주 안에 만료 예정인 지급분은 expiringThisWeek 에 합산된다")
    void getSummary_expiringThisWeek_sumsSoonExpiringLots() {
        User owner = masterUser();
        service.checkIn(owner.getId());

        // 방금 지급된 lot의 만료 시각을 가까운 미래로 당겨 이번 주 안에 소멸 예정으로 만든다
        List<AttendanceCreditTransaction> lots = transactionRepo.findAll().stream()
                .filter(t -> t.getOwnerUserId().equals(owner.getId()))
                .toList();
        assertThat(lots).isNotEmpty();
        AttendanceCreditTransaction lot = lots.get(0);
        // plusMinutes(30): "지금보다 늦고, 이번 주(월~일) 안"을 만족시키되 일요일 자정 근접 경계에서의
        // 날짜 넘어감(플레이키니스)을 피하기 위해 plusDays 대신 짧은 분 단위로 당긴다.
        LocalDateTime soon = LocalDateTime.now(SEOUL).plusMinutes(30);
        ReflectionTestUtils.setField(lot, "expiresAt", soon);
        transactionRepo.saveAndFlush(lot);

        AttendanceCreditSummaryResponse summary = service.getSummary(owner.getId());
        assertThat(summary.expiringThisWeek()).isEqualTo(lot.getRemainingQuantity());
    }

    // ─────────────────────────────────────────────────────────────────
    // 만료(lazy 판정) — 지급 30일 후 소멸
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("지급분 만료 시각이 지나면 조회 시 잔액에서 lazy 반영되고, 소모도 그 잔액 기준으로 막힌다")
    void expiredGrant_excludedFromBalance_lazily() {
        User owner = masterUser();
        AttendanceCreditCheckInResponse checkIn = service.checkIn(owner.getId());
        assertThat(checkIn.grantedQuantity()).isGreaterThan(0);

        // 방금 지급된 거래(들)의 만료 시각을 과거로 되돌린다(30일 뒤 소멸을 시뮬레이션) — DB는 아직 그대로다(lazy).
        List<AttendanceCreditTransaction> lots = transactionRepo.findAll().stream()
                .filter(t -> t.getOwnerUserId().equals(owner.getId()))
                .toList();
        LocalDateTime past = LocalDateTime.now(SEOUL).minusSeconds(1);
        for (AttendanceCreditTransaction lot : lots) {
            ReflectionTestUtils.setField(lot, "expiresAt", past);
            transactionRepo.saveAndFlush(lot);
        }

        // 조회(readOnly)는 잔액을 0으로 계산해 보여주지만, DB의 remainingQuantity/지갑 balance는 아직 스윕 전이다.
        AttendanceCreditSummaryResponse summary = service.getSummary(owner.getId());
        assertThat(summary.balance()).isZero();
        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(checkIn.grantedQuantity());

        // 소모 시도는 스윕 후 재계산된 잔액(0) 기준으로 거부된다.
        assertThatThrownBy(() -> service.consumeForOfferSend(owner.getId()))
                .isInstanceOf(InsufficientCreditException.class)
                .satisfies(e -> assertThat(((InsufficientCreditException) e).getBalance()).isZero());

        // 소모 시도(실패했어도 그 과정에서 sweep은 반영됨)로 인해 DB 잔액도 0으로 보정된다.
        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isZero();
    }

    // ─────────────────────────────────────────────────────────────────
    // 소모 — 잔액 충분/부족
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("지갑이 아예 없는 사장의 소모 시도 → InsufficientCreditException(402, balance=0)")
    void consume_noWallet_throwsInsufficientCredit() {
        User owner = masterUser();

        assertThatThrownBy(() -> service.consumeForOfferSend(owner.getId()))
                .isInstanceOf(InsufficientCreditException.class)
                .satisfies(e -> {
                    InsufficientCreditException ex = (InsufficientCreditException) e;
                    assertThat(ex.getRequired()).isEqualTo(properties.getOfferSendCost());
                    assertThat(ex.getBalance()).isZero();
                });
    }

    @Test
    @DisplayName("잔액 충분 시 제안 발송 소모(설정 수량) — 잔액이 정확히 차감된다")
    void consumeForOfferSend_sufficientBalance_deducts() {
        User owner = masterUser();
        grantCredits(owner, 5);

        service.consumeForOfferSend(owner.getId());

        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance())
                .isEqualTo(5 - properties.getOfferSendCost());
    }

    @Test
    @DisplayName("잔액 충분 시 지원서 열람+채팅 개설 소모(설정 수량) — 잔액이 정확히 차감된다")
    void consumeForApplicationView_sufficientBalance_deducts() {
        User owner = masterUser();
        grantCredits(owner, 5);

        service.consumeForApplicationViewChatOpen(owner.getId());

        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance())
                .isEqualTo(5 - properties.getApplicationViewCost());
    }

    @Test
    @DisplayName("잔액 부족 시 소모 시도 → InsufficientCreditException, 잔액은 변경되지 않는다")
    void consume_insufficientBalance_doesNotMutate() {
        User owner = masterUser();
        grantCredits(owner, 1);

        assertThatThrownBy(() -> service.consumeForApplicationViewChatOpen(owner.getId()))
                .isInstanceOf(InsufficientCreditException.class);

        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(1);
    }

    // ─────────────────────────────────────────────────────────────────
    // 낙관적 락 동시성 — 동시 소모 요청 방지(WorkShiftServiceTest와 동일한 "오래된 버전으로 직접 갱신
    // 시도" 패턴 — 별도 스레드/트랜잭션 없이도 버전 불일치 자체가 DB UPDATE의 WHERE 절 미스매치로
    // 감지된다).
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("동시 소모 요청 — 먼저 커밋된 갱신 이후 오래된 버전으로 재차 갱신하면 낙관적 락 충돌")
    void concurrentConsume_staleVersion_throwsOptimisticLockConflict() {
        User owner = masterUser();
        AttendanceCredit wallet = grantCredits(owner, 10);
        walletRepo.flush();
        Long id = wallet.getId();
        Long staleVersion = wallet.getVersion();

        // "요청 A": 정상 소모(서비스 경유) — 버전이 증가하고 잔액이 줄어든다
        service.consumeForOfferSend(owner.getId());
        walletRepo.flush();
        AttendanceCredit afterA = walletRepo.findById(id).orElseThrow();
        assertThat(afterA.getVersion()).isNotEqualTo(staleVersion);
        assertThat(afterA.getBalance()).isEqualTo(10 - properties.getOfferSendCost());

        // "요청 B": A가 시작되기 전(오래된 버전) 스냅샷을 들고 있다가 뒤늦게 직접 갱신을 시도 — 충돌해야 한다
        AttendanceCredit stale = AttendanceCredit.openFor(owner.getId());
        ReflectionTestUtils.setField(stale, "id", id);
        ReflectionTestUtils.setField(stale, "balance", 3);
        ReflectionTestUtils.setField(stale, "version", staleVersion);

        assertThatThrownBy(() -> walletRepo.saveAndFlush(stale))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        // 충돌한 시도는 반영되지 않고 A의 결과가 유지된다
        AttendanceCredit reloaded = walletRepo.findById(id).orElseThrow();
        assertThat(reloaded.getBalance()).isEqualTo(10 - properties.getOfferSendCost());
    }

    private boolean isWeekendGrantDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return dow == DayOfWeek.FRIDAY || dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }
}
