package com.rich.sodam.domain;

import com.rich.sodam.dto.request.NotificationPreferenceUpdateRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 외부 푸시 허용 판정 — 방해금지시간(자정 넘김 포함)과 정보통신망법 §50③ 야간 광고 차단.
 *
 * <p>인앱 알림함 적재는 이 판정과 무관하게 항상 이뤄진다({@code NotificationService.push}).
 * 여기서 검증하는 것은 FCM 등 외부 전달 여부뿐이다.</p>
 */
class NotificationPreferenceQuietHoursTest {

    private NotificationPreference preferenceWith(boolean marketing, boolean quietHoursEnabled,
                                                  String quietStart, String quietEnd) {
        NotificationPreference preference = NotificationPreference.defaultsFor(1L);
        preference.update(new NotificationPreferenceUpdateRequest(
                true, true, true, true, marketing, quietHoursEnabled, quietStart, quietEnd));
        return preference;
    }

    // ===== 정보통신망법 §50③ — 광고성 정보 야간(21:00~08:00) 전송 =====

    @Test
    @DisplayName("마케팅 수신에 동의해도 21:00~08:00 에는 외부 푸시를 보내지 않는다")
    void 마케팅_야간_전송은_수신동의만으로_열리지_않는다() {
        NotificationPreference preference = preferenceWith(true, false, "22:00", "07:00");

        assertFalse(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(21, 0)));
        assertFalse(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(23, 30)));
        assertFalse(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(3, 0)));
        assertFalse(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(7, 59)));
    }

    @Test
    @DisplayName("마케팅도 주간(08:00~21:00)에는 동의가 있으면 발송한다")
    void 마케팅_주간_전송은_동의가_있으면_허용된다() {
        NotificationPreference preference = preferenceWith(true, false, "22:00", "07:00");

        assertTrue(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(8, 0)));
        assertTrue(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(20, 59)));
    }

    @Test
    @DisplayName("야간 차단은 광고성에만 적용되고 근태·급여 알림은 막지 않는다")
    void 야간_차단은_광고성에만_적용된다() {
        NotificationPreference preference = preferenceWith(true, false, "22:00", "07:00");

        assertTrue(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(3, 0)));
        assertTrue(preference.allows(NotificationInbox.Category.PAYROLL, LocalTime.of(3, 0)));
        assertTrue(preference.allows(NotificationInbox.Category.BILLING, LocalTime.of(3, 0)));
    }

    @Test
    @DisplayName("마케팅 수신을 끄면 주간에도 발송하지 않는다")
    void 마케팅_수신거부는_주간에도_유지된다() {
        NotificationPreference preference = preferenceWith(false, false, "22:00", "07:00");

        assertFalse(preference.allows(NotificationInbox.Category.MARKETING, LocalTime.of(14, 0)));
    }

    // ===== 방해금지시간 =====

    @Test
    @DisplayName("방해금지시간이 자정을 넘어도 구간 판정이 정확하다")
    void 방해금지시간은_자정을_넘겨도_동작한다() {
        NotificationPreference preference = preferenceWith(false, true, "22:00", "07:00");

        assertFalse(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(22, 0)));
        assertFalse(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(23, 59)));
        assertFalse(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(0, 0)));
        assertFalse(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(6, 59)));

        assertTrue(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(7, 0)));
        assertTrue(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(21, 59)));
    }

    @Test
    @DisplayName("방해금지시간이 꺼져 있으면 심야에도 근태 알림은 나간다")
    void 방해금지시간_비활성이면_심야에도_발송한다() {
        NotificationPreference preference = preferenceWith(false, false, "22:00", "07:00");

        assertTrue(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(3, 0)));
    }

    @Test
    @DisplayName("시작·종료가 같으면 24시간 전체를 방해금지로 본다")
    void 시작과_종료가_같으면_하루_전체가_방해금지다() {
        NotificationPreference preference = preferenceWith(false, true, "09:00", "09:00");

        assertFalse(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(9, 0)));
        assertFalse(preference.allows(NotificationInbox.Category.ATTENDANCE, LocalTime.of(15, 0)));
    }
}
