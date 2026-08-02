package com.rich.sodam.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 채팅 PII 자동 마스킹 유틸 테스트(recruitment-monetization-gamification-plan.md §4.3).
 */
class ChatMessageMaskerTest {

    // ─────────────────────────────────────────────────────────────────
    // 전화번호 — 다양한 표기 변형
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("휴대폰 번호(하이픈) 마스킹")
    void masksMobileWithDashes() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("연락처는 010-1234-5678 이에요");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).isEqualTo("연락처는 010-****-**** 이에요");
    }

    @Test
    @DisplayName("휴대폰 번호(붙여쓰기, 구분자 없음) 마스킹")
    void masksMobileWithoutSeparator() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("01012345678로 연락주세요");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).contains("010-****-****");
    }

    @Test
    @DisplayName("휴대폰 번호(마침표 구분) 마스킹")
    void masksMobileWithDots() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("010.9876.5432 로 문자주세요");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).contains("010-****-****");
    }

    @Test
    @DisplayName("유선전화(서울 02) 마스킹")
    void masksSeoulLandline() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("매장 전화는 02-1234-5678 입니다");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).contains("02-****-****");
    }

    @Test
    @DisplayName("지역 유선전화(031) 마스킹")
    void masksRegionalLandline() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("031-123-4567 로 걸어주세요");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).contains("031-****-****");
    }

    // ─────────────────────────────────────────────────────────────────
    // 계좌번호
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("하이픈 구분 계좌번호 마스킹")
    void masksDashedAccountNumber() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("계좌는 110-1234-567890 이에요");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).doesNotContain("110-1234-567890");
        assertThat(result.content()).contains("[계좌번호로 추정되는 정보가 가려졌어요]");
    }

    @Test
    @DisplayName("구분자 없는 긴 숫자열(계좌번호 추정) 마스킹")
    void masksPlainLongDigitRun() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask("계좌번호 1101234567890 입니다");

        assertThat(result.masked()).isTrue();
        assertThat(result.content()).doesNotContain("1101234567890");
    }

    // ─────────────────────────────────────────────────────────────────
    // 오탐 방지 — 금액(콤마)/한글 날짜 표기는 마스킹되면 안 된다
    // ─────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(strings = {
            "시급 12,000원이에요",
            "시급은 10,500원부터 시작해요",
            "10월 3일부터 근무 가능해요",
            "9시부터 18시까지 근무해요",
            "오늘 3시에 뵐까요?",
            "몇 시까지 오면 될까요?",
            "네 가능해요",
    })
    @DisplayName("정상 메시지(금액/날짜/일반 문장)는 마스킹되지 않는다")
    void doesNotMaskNormalMessages(String message) {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask(message);

        assertThat(result.masked()).isFalse();
        assertThat(result.content()).isEqualTo(message);
    }

    @Test
    @DisplayName("null 입력은 빈 문자열/마스킹 없음으로 처리")
    void handlesNullGracefully() {
        ChatMessageMasker.MaskResult result = ChatMessageMasker.mask(null);

        assertThat(result.masked()).isFalse();
        assertThat(result.content()).isEmpty();
    }
}
