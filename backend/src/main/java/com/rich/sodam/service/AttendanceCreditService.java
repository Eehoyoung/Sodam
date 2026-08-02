package com.rich.sodam.service;

import com.rich.sodam.config.AttendanceCreditProperties;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditCheckIn;
import com.rich.sodam.domain.AttendanceCreditTransaction;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.domain.type.AttendanceCreditTransactionReason;
import com.rich.sodam.domain.type.AttendanceCreditTransactionType;
import com.rich.sodam.dto.response.AttendanceCreditCheckInResponse;
import com.rich.sodam.dto.response.AttendanceCreditSummaryResponse;
import com.rich.sodam.dto.response.AttendanceCreditWeekDayStatus;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.InsufficientCreditException;
import com.rich.sodam.repository.AttendanceCreditCheckInRepository;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceCreditTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 출근권(사장 전용 채용 재화) 서비스 — 지급(일일 출석체크·스트릭 보너스)·소모(제안 발송·지원서
 * 열람+채팅 개설)·잔액/소멸예정 조회(recruitment-monetization-gamification-plan.md §2, §5).
 *
 * <p><b>잔액의 "진짜" 값</b>: {@link AttendanceCredit#getBalance()} 컬럼은 지급/소모 시점에만 갱신되는
 * 캐시다. 무료 지급분의 만료는 배치 없이 lazy 하게 처리한다(JobOffer의 EXPIRED lazy 판정과 동일
 * 원칙) — 조회({@link #getSummary})는 원장을 스캔해 "아직 스윕되지 않은 만료 lot" 만큼을 그 자리에서
 * 빼서 보여주기만 하고 DB에 쓰지 않는다(읽기 전용 트랜잭션 유지). 실제 컬럼 보정(스윕)은 다음 소모
 * ({@link #consumeForOfferSend}/{@link #consumeForApplicationViewChatOpen}) 시점에만 일어난다 —
 * 어차피 그 시점엔 정확한 잔액이 필요해 원장을 다시 읽어야 하므로 추가 비용이 없다.</p>
 *
 * <p><b>FIFO 소모</b>: 소모는 만료 임박순으로 공급 lot을 차감한다(무료 지급분을 먼저 쓰게 해 낭비를
 * 최소화). {@link AttendanceCreditTransaction} 클래스 주석 참고.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceCreditService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final Set<DayOfWeek> WEEKEND_GRANT_DAYS = Set.of(DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);

    private final AttendanceCreditRepository attendanceCreditRepository;
    private final AttendanceCreditTransactionRepository transactionRepository;
    private final AttendanceCreditCheckInRepository checkInRepository;
    private final AttendanceCreditProperties properties;

    // ─────────────────────────────────────────────────────────────────
    // GET /api/attendance-credits/me
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AttendanceCreditSummaryResponse getSummary(Long ownerUserId) {
        LocalDateTime now = LocalDateTime.now(SEOUL);
        LocalDate today = now.toLocalDate();

        AttendanceCredit wallet = attendanceCreditRepository.findByOwnerUserId(ownerUserId).orElse(null);
        int rawBalance = wallet == null ? 0 : wallet.getBalance();
        int expiredUnswept = wallet == null ? 0 : transactionRepository.sumExpiredUnswept(ownerUserId, now);
        int effectiveBalance = Math.max(0, rawBalance - expiredUnswept);

        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        LocalDateTime weekEndDateTime = weekEnd.atTime(23, 59, 59);
        int expiringThisWeek = wallet == null ? 0
                : transactionRepository.sumExpiringBetween(ownerUserId, now, weekEndDateTime);

        List<AttendanceCreditWeekDayStatus> weeklyGrid = buildWeeklyGrid(ownerUserId, weekStart, weekEnd, today);
        boolean checkedInToday = wallet != null && wallet.hasCheckedInOn(today);
        int currentStreak = wallet == null ? 0 : wallet.getCurrentStreak();

        return new AttendanceCreditSummaryResponse(effectiveBalance, expiringThisWeek, currentStreak,
                checkedInToday, weeklyGrid);
    }

    private List<AttendanceCreditWeekDayStatus> buildWeeklyGrid(Long ownerUserId, LocalDate weekStart,
                                                                  LocalDate weekEnd, LocalDate today) {
        Map<LocalDate, AttendanceCreditCheckIn> byDate = checkInRepository
                .findByOwnerUserIdAndCheckInDateBetween(ownerUserId, weekStart, weekEnd).stream()
                .collect(java.util.stream.Collectors.toMap(AttendanceCreditCheckIn::getCheckInDate, c -> c));

        List<AttendanceCreditWeekDayStatus> grid = new ArrayList<>(7);
        LocalDate cursor = weekStart;
        while (!cursor.isAfter(weekEnd)) {
            grid.add(new AttendanceCreditWeekDayStatus(
                    cursor, cursor.getDayOfWeek().name().substring(0, 3), byDate.containsKey(cursor), cursor.equals(today)));
            cursor = cursor.plusDays(1);
        }
        return grid;
    }

    // ─────────────────────────────────────────────────────────────────
    // POST /api/attendance-credits/check-in
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public AttendanceCreditCheckInResponse checkIn(Long ownerUserId) {
        LocalDateTime now = LocalDateTime.now(SEOUL);
        LocalDate today = now.toLocalDate();

        AttendanceCredit wallet = attendanceCreditRepository.findByOwnerUserId(ownerUserId)
                .orElseGet(() -> attendanceCreditRepository.save(AttendanceCredit.openFor(ownerUserId)));

        if (wallet.hasCheckedInOn(today)) {
            throw new ConflictException("오늘은 이미 출석체크를 했어요.", "ATTENDANCE_CREDIT_ALREADY_CHECKED_IN");
        }

        int grantedQuantity = WEEKEND_GRANT_DAYS.contains(today.getDayOfWeek())
                ? properties.getWeekendGrant() : properties.getWeekdayGrant();

        wallet.recordCheckIn(today);
        wallet.addBalance(grantedQuantity);

        LocalDateTime expiresAt = now.plusDays(properties.getFreeGrantExpiryDays());
        transactionRepository.save(AttendanceCreditTransaction.supply(ownerUserId,
                AttendanceCreditTransactionType.GRANT, AttendanceCreditTransactionReason.DAILY_CHECK_IN,
                grantedQuantity, expiresAt, now));

        boolean streakBonusGranted = wallet.getCurrentStreak() > 0
                && wallet.getCurrentStreak() % properties.getStreakBonusIntervalDays() == 0;
        int streakBonusQuantity = 0;
        if (streakBonusGranted) {
            streakBonusQuantity = properties.getStreakBonusQuantity();
            wallet.addBalance(streakBonusQuantity);
            transactionRepository.save(AttendanceCreditTransaction.supply(ownerUserId,
                    AttendanceCreditTransactionType.GRANT, AttendanceCreditTransactionReason.STREAK_BONUS,
                    streakBonusQuantity, expiresAt, now));
        }

        try {
            attendanceCreditRepository.save(wallet);
            checkInRepository.saveAndFlush(
                    AttendanceCreditCheckIn.of(ownerUserId, today, grantedQuantity, streakBonusGranted, now));
        } catch (DataIntegrityViolationException e) {
            // 동시 요청 레이스 — DB 유니크 제약(owner_user_id, check_in_date) 위반을 409로 변환(이중 방어 뒷단)
            log.info("AttendanceCreditCheckIn 동시 중복 방지 — ownerUserId={} date={}", ownerUserId, today);
            throw new ConflictException("오늘은 이미 출석체크를 했어요.", "ATTENDANCE_CREDIT_ALREADY_CHECKED_IN");
        }

        return new AttendanceCreditCheckInResponse(grantedQuantity, streakBonusGranted, streakBonusQuantity,
                wallet.getBalance(), wallet.getCurrentStreak());
    }

    // ─────────────────────────────────────────────────────────────────
    // 소모 — 채용 제안 발송 / 지원서 열람+채팅 개설
    // ─────────────────────────────────────────────────────────────────

    /** 채용 제안 발송 1건 소모(§2.3) — {@code JobOfferService.sendOffer}가 검증 통과 후 호출한다. */
    @Transactional
    public void consumeForOfferSend(Long ownerUserId) {
        consume(ownerUserId, properties.getOfferSendCost(), AttendanceCreditTransactionReason.OFFER_SEND);
    }

    /** 지원서 열람+채팅방 개설 1건 소모(§2.3) — {@code JobApplicationService.respondToApplication}가 호출한다. */
    @Transactional
    public void consumeForApplicationViewChatOpen(Long ownerUserId) {
        consume(ownerUserId, properties.getApplicationViewCost(), AttendanceCreditTransactionReason.APPLICATION_VIEW_CHAT_OPEN);
    }

    private void consume(Long ownerUserId, int amount, AttendanceCreditTransactionReason reason) {
        LocalDateTime now = LocalDateTime.now(SEOUL);
        AttendanceCredit wallet = attendanceCreditRepository.findByOwnerUserId(ownerUserId).orElse(null);

        if (wallet == null) {
            throw new InsufficientCreditException("출근권이 부족해요. 출석체크로 모으거나 충전 후 다시 시도해 주세요.", amount, 0);
        }

        sweepExpiredLots(wallet, now);

        if (wallet.getBalance() < amount) {
            throw new InsufficientCreditException("출근권이 부족해요. 출석체크로 모으거나 충전 후 다시 시도해 주세요.",
                    amount, wallet.getBalance());
        }

        drawDownFifo(ownerUserId, amount, now);
        wallet.subtractBalance(amount);
        attendanceCreditRepository.save(wallet);
        transactionRepository.save(AttendanceCreditTransaction.consume(ownerUserId, reason, amount, now));
    }

    /** 만료됐지만 아직 반영 안 된 lot을 0으로 정리하고, 그만큼 지갑 잔액을 실제로 깎아 영속화한다(쓰기 전용 경로에서만 호출). */
    private void sweepExpiredLots(AttendanceCredit wallet, LocalDateTime now) {
        List<AttendanceCreditTransaction> expiredLots =
                transactionRepository.findExpiredUnsweptLots(wallet.getOwnerUserId(), now);
        int total = 0;
        for (AttendanceCreditTransaction lot : expiredLots) {
            total += lot.getRemainingQuantity();
            lot.drawDown(lot.getRemainingQuantity());
            transactionRepository.save(lot);
        }
        if (total > 0) {
            // 이미 소모로 인해 balance가 만료분보다 적게 반영돼 있을 수 있으니(다른 소모가 먼저 그 lot을 이미 썼을 수 있음)
            // 0 미만으로 내려가지 않게 방어적으로 clamp 한다.
            int clamped = Math.min(total, wallet.getBalance());
            if (clamped > 0) {
                wallet.subtractBalance(clamped);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // 충전(IAP) — 출근권 충전소(§2.4). 결제 승인/웹훅이 확정된 뒤에만 호출된다
    // (금액·paymentKey 검증·멱등은 AttendanceCreditChargeService 책임 — 여기는 "지급"만 담당해
    // 잔액/원장 변경 로직이 여러 서비스에 중복되지 않게 한다).
    // ─────────────────────────────────────────────────────────────────

    /** 결제 승인 1건이 지급한 결과 — 주문 응답/로깅에 필요한 값만 담는다. */
    public record ChargeGrantResult(int baseCreditQuantity, int bonusCreditQuantity, int ticketQuantity,
                                     boolean firstPurchaseBonusApplied, int newBalance,
                                     int newStreakRecoveryTickets) {
    }

    /**
     * 충전 상품 1건 지급 — 출근권(재화)은 무기한(§2.4: 유료 충전분은 만료 없음) TOPUP/IAP_TOPUP으로
     * 원장에 남기고, 스트릭 복구권(단품 티켓)은 별도 카운터에만 더한다(원장 미사용 — 클래스 상단
     * {@link AttendanceCredit#addStreakRecoveryTickets} 주석 참고). 첫 구매 2배 이벤트는 "재화가
     * 포함된" 첫 결제 1건에만, 그 순간의 지갑 상태(낙관적 락 보호)로 판정한다.
     */
    @Transactional
    public ChargeGrantResult grantCharge(Long ownerUserId, AttendanceCreditChargePackCode packCode,
                                          int creditQuantity, int ticketQuantity,
                                          boolean firstPurchaseBonusEnabled, int firstPurchaseBonusMultiplier) {
        LocalDateTime now = LocalDateTime.now(SEOUL);
        AttendanceCredit wallet = attendanceCreditRepository.findByOwnerUserId(ownerUserId)
                .orElseGet(() -> attendanceCreditRepository.save(AttendanceCredit.openFor(ownerUserId)));

        boolean bonusApplied = false;
        int bonusQuantity = 0;
        // 스트릭 복구권 단독 구매(creditQuantity==0)는 재화가 아니므로 첫구매 이벤트 소진 대상이 아니다
        // (§10 확인 필요 항목으로 별도 보고 — "최초 결제"의 정확한 정의는 인간 확인 대기).
        if (creditQuantity > 0 && firstPurchaseBonusEnabled && wallet.hasFirstChargeBonusAvailable()) {
            bonusApplied = true;
            bonusQuantity = creditQuantity * Math.max(0, firstPurchaseBonusMultiplier - 1);
            wallet.markFirstChargeBonusGranted();
        }

        int totalCredit = creditQuantity + bonusQuantity;
        if (totalCredit > 0) {
            wallet.addBalance(totalCredit);
            transactionRepository.save(AttendanceCreditTransaction.supply(ownerUserId,
                    AttendanceCreditTransactionType.TOPUP, AttendanceCreditTransactionReason.IAP_TOPUP,
                    totalCredit, null, now)); // expiresAt=null → 무기한(유료 충전분)
        }
        if (ticketQuantity > 0) {
            wallet.addStreakRecoveryTickets(ticketQuantity);
        }
        attendanceCreditRepository.save(wallet);

        log.info("출근권 충전 지급 ownerUserId={} pack={} base={} bonus={} ticket={} 잔액={}",
                ownerUserId, packCode, creditQuantity, bonusQuantity, ticketQuantity, wallet.getBalance());

        return new ChargeGrantResult(creditQuantity, bonusQuantity, ticketQuantity, bonusApplied,
                wallet.getBalance(), wallet.getStreakRecoveryTickets());
    }

    /** 카탈로그 조회용 — 이 사장이 첫구매 2배 이벤트를 아직 쓰지 않았는지(지갑이 없으면 당연히 미사용). */
    @Transactional(readOnly = true)
    public boolean isFirstChargeBonusAvailable(Long ownerUserId) {
        return attendanceCreditRepository.findByOwnerUserId(ownerUserId)
                .map(AttendanceCredit::hasFirstChargeBonusAvailable)
                .orElse(true);
    }

    /** {@link #reverseChargeBestEffort} 1회 호출의 결과 — 호출자가 감사 로그(claw-back 근거)를 남길 때 사용한다. */
    public record ReversalResult(int creditsRequested, int creditsActuallyReversed,
                                  int ticketsRequested, int ticketsActuallyReversed) {
    }

    /**
     * 결제 취소/환불 웹훅에 의한 최선노력 회수(claw-back) — 이미 다른 소모(제안발송 등)로 써버린
     * 만큼은 회수하지 않는다(잔액 0 하한, {@link #sweepExpiredLots}와 동일한 clamp 원칙). 회수하지
     * 못한 차액은 운영 확인이 필요하므로 경고 로그를 남기고 예외를 던지지 않는다(웹훅 재시도 루프에서
     * 계속 500이 나면 더 큰 문제이므로).
     *
     * <p><b>입력값은 이미 비례 계산된 값</b>: 호출자({@link AttendanceCreditChargeService#cancelFromWebhook})가
     * 취소 비율(cancelAmount / 원래 결제금액)만큼 미리 곱해 전달한다 — 이 메서드는 "이만큼 회수하라"고
     * 받은 값을 그대로(단, 잔액 0 하한만 적용해) 반영할 뿐, 취소 금액과의 비례 계산은 하지 않는다.</p>
     */
    @Transactional
    public ReversalResult reverseChargeBestEffort(Long ownerUserId, int creditsToReverse, int ticketsToReverse) {
        AttendanceCredit wallet = attendanceCreditRepository.findByOwnerUserId(ownerUserId).orElse(null);
        if (wallet == null) {
            return new ReversalResult(creditsToReverse, 0, ticketsToReverse, 0);
        }
        int creditsActuallyReversed = 0;
        if (creditsToReverse > 0) {
            int clamped = Math.min(creditsToReverse, wallet.getBalance());
            if (clamped > 0) {
                wallet.subtractBalance(clamped);
                creditsActuallyReversed = clamped;
            }
            if (clamped < creditsToReverse) {
                log.warn("출근권 결제취소 회수 부족(이미 소모됨, 운영 확인 필요) ownerUserId={} 요청={} 실제회수={}",
                        ownerUserId, creditsToReverse, clamped);
            }
        }
        int ticketsActuallyReversed = 0;
        if (ticketsToReverse > 0) {
            int beforeTickets = wallet.getStreakRecoveryTickets();
            wallet.reverseStreakRecoveryTickets(ticketsToReverse);
            ticketsActuallyReversed = beforeTickets - wallet.getStreakRecoveryTickets();
        }
        attendanceCreditRepository.save(wallet);
        return new ReversalResult(creditsToReverse, creditsActuallyReversed, ticketsToReverse, ticketsActuallyReversed);
    }

    private void drawDownFifo(Long ownerUserId, int amount, LocalDateTime now) {
        List<AttendanceCreditTransaction> lots = transactionRepository.findActiveLotsForConsumption(ownerUserId, now);
        int remaining = amount;
        for (AttendanceCreditTransaction lot : lots) {
            if (remaining <= 0) {
                break;
            }
            int draw = Math.min(remaining, lot.getRemainingQuantity());
            lot.drawDown(draw);
            transactionRepository.save(lot);
            remaining -= draw;
        }
        if (remaining > 0) {
            // 잔액 검증을 이미 통과했는데도 lot 합계가 모자라면 원장-잔액 정합성이 깨진 것 — 방어적 가드
            throw new IllegalStateException("출근권 소모 처리 중 정합성 오류가 발생했어요.");
        }
    }
}
