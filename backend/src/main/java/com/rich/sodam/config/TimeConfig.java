package com.rich.sodam.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * 애플리케이션 표준 시간대 정책과 주입 가능한 {@link Clock} (WP-10).
 *
 * 소담의 모든 시각은 Asia/Seoul(KST) 기준이다. 날짜 경계/급여/스케줄 계산 로직을
 * {@code LocalDate.now()}/{@code LocalDateTime.now()} 직접 호출 대신 이 Clock을 주입받는
 * 형태로 점진 치환한다(계획서 WP-10 — 기존 호출부를 한 번에 기계 치환하지 않고, 테스트
 * 가능성이 중요한 경계 계산부터 시작한다).
 */
@Configuration
public class TimeConfig {

    public static final ZoneId APP_ZONE = ZoneId.of("Asia/Seoul");

    @Bean
    public Clock clock() {
        return Clock.system(APP_ZONE);
    }
}
