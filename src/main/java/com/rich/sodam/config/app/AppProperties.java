package com.rich.sodam.config.app;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 애플리케이션 설정 프로퍼티 클래스
 * application.yml의 app 섹션 설정을 타입 안전하게 관리합니다.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    /**
     * 매장 관련 설정
     */
    private Store store = new Store();

    /**
     * Redis 관련 설정
     */
    private Redis redis = new Redis();

    /**
     * 매장 설정 클래스
     */
    @Getter
    @Setter
    public static class Store {
        /**
         * 출퇴근 인증 기본 반경(미터)
         */
        private Integer defaultRadius = 100;
    }

    /**
     * Redis 설정 클래스
     */
    @Getter
    @Setter
    public static class Redis {
        /**
         * 캐시용 Redis 데이터베이스 번호
         */
        private Integer cacheDatabase = 1;
    }
}
