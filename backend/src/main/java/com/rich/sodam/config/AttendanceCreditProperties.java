package com.rich.sodam.config;

import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.stereotype.Component;

/**
 * 출근권 이코노미 수치 설정(recruitment-monetization-gamification-plan.md §2.2·§2.3·§2.4).
 *
 * <p>지급/소모/만료/충전 수치는 하드코딩하지 않고 전부 이 설정값을 거친다 — 파일럿 운영 데이터로
 * 조정될 예정이거나(§10 확인 필요 항목 1) 최종 가격이 미확정(§10 항목 2)이므로 코드 변경 없이
 * {@code application.yml}/env override 만으로 조정 가능해야 한다. {@code sodam.attendance-credit.*}
 * 트리에서 매핑된다.</p>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.attendance-credit")
public class AttendanceCreditProperties {

    /** 월~목 출석체크 지급 수량. */
    private int weekdayGrant = 3;

    /** 금~일 출석체크 지급 수량. */
    private int weekendGrant = 5;

    /** 7일 연속 출석 달성 보너스 수량. */
    private int streakBonusQuantity = 10;

    /** 보너스 지급 주기(연속 출석 N일마다). */
    private int streakBonusIntervalDays = 7;

    /** 무료 지급분 유효기간(일) — 지급일로부터 이 기간 후 소멸. 유료 충전분은 무기한(이 값 미적용). */
    private int freeGrantExpiryDays = 30;

    /** 채용 제안 발송 1건당 소모 수량. */
    private int offerSendCost = 1;

    /** 지원서 열람+채팅방 개설 1건당 소모 수량. */
    private int applicationViewCost = 2;

    /** 출근권 충전소(IAP) 설정 — §2.4. */
    @NestedConfigurationProperty
    private Charge charge = new Charge();

    /**
     * 충전 팩(상품) 수량/가격 + 첫 구매 보너스 설정. 값은 전부 §10에서 "미확정"으로 명시된 항목이라
     * 코드에 상수로 박지 않는다 — {@code sodam.attendance-credit.charge.*} env override로 운영 중
     * 조정한다(예: {@code SODAM_ATTENDANCE_CREDIT_CHARGE_SMALL_PRICE_KRW}).
     */
    @Getter
    @Setter
    public static class Charge {

        /** 신규 사장 최초 "출근권(재화) 충전" 1회 한정 수량 2배 지급 여부(스위치). */
        private boolean firstPurchaseBonusEnabled = true;

        /** 첫 구매 보너스 배수(2 = 2배 지급, 즉 원래 수량만큼을 보너스로 추가 지급). */
        private int firstPurchaseBonusMultiplier = 2;

        /**
         * "웰컴 2배 이벤트" 같은 프로모션 문구를 FE 에 실제로 노출할지 스위치.
         * §8 리스크(표시광고법 등) 법무 검토 완료 전까지는 기본 off — 지급 로직 자체는 이 값과
         * 무관하게 동작하고(firstPurchaseBonusEnabled 로만 제어), 이 플래그는 순수 "문구 노출" 게이트다.
         *
         * <p><b>이 스위치를 켤 때 반드시 지킬 것(법무검토 2026-08-03 참고, §12)</b>: 프로모션 문구를
         * 노출하는 순간 조건 문구(1인 1회 한정, 재화가 포함된 결제만 해당 — 스트릭 복구권 단독구매
         * 제외)를 <b>동일 가시성으로 함께</b> 표시해야 한다. 프로모션 배지만 크게 보이고 조건은 작은
         * 각주로 숨기는 방식은 표시광고법상 리스크로 지적됨 — {@code AttendanceCreditChargeScreen.tsx}
         * 수정 시 이 조건 문구 배선을 빠뜨리지 말 것.</p>
         */
        private boolean promoCopyEnabled = false;

        /** 스몰 팩 — 지급 수량. */
        private int smallQuantity = 10;
        /** 스몰 팩 — 가격(원). */
        private int smallPriceKrw = 1_900;

        /** 미디엄 팩 — 지급 수량. */
        private int mediumQuantity = 50;
        /** 미디엄 팩 — 가격(원). */
        private int mediumPriceKrw = 7_900;

        /** 라지 팩 — 지급 수량. */
        private int largeQuantity = 120;
        /** 라지 팩 — 가격(원). */
        private int largePriceKrw = 15_900;

        /** 스트릭 복구권 — 가격(원). 재화가 아닌 단품이라 수량은 항상 1(구매당 1장). */
        private int streakRecoveryPriceKrw = 900;

        /** 상품코드 → (지급 출근권 수량, 지급 티켓 수량, 가격) 조회. */
        public PackQuote quote(AttendanceCreditChargePackCode code) {
            return switch (code) {
                case SMALL -> new PackQuote(code, smallQuantity, 0, smallPriceKrw);
                case MEDIUM -> new PackQuote(code, mediumQuantity, 0, mediumPriceKrw);
                case LARGE -> new PackQuote(code, largeQuantity, 0, largePriceKrw);
                case STREAK_RECOVERY -> new PackQuote(code, 0, 1, streakRecoveryPriceKrw);
            };
        }

        public java.util.List<PackQuote> allQuotes() {
            return java.util.Arrays.stream(AttendanceCreditChargePackCode.values()).map(this::quote).toList();
        }
    }

    /** 상품 1건의 현재 판매 조건(수량/가격) — 설정값에서 즉시 조회한 스냅샷. */
    public record PackQuote(AttendanceCreditChargePackCode code, int creditQuantity, int ticketQuantity, int priceKrw) {
    }
}
