package com.rich.sodam.config;

import org.springframework.boot.web.server.Compression;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

/**
 * 웹 서버 설정
 * 서버 비용 최소화를 위한 응답 압축 및 성능 최적화 설정
 */
@Configuration
public class WebServerConfig {

    /**
     * HTTP 응답 압축 설정
     * 네트워크 대역폭 사용량을 줄이고 응답 시간을 개선하기 위한 Gzip 압축 설정
     */
    @Bean
    public WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> webServerFactoryCustomizer() {
        return factory -> {
            // 응답 압축 활성화
            Compression compression = new Compression();
            compression.setEnabled(true);

            // 압축 최소 응답 크기 설정 (2KB)
            compression.setMinResponseSize(DataSize.ofKilobytes(2));

            // 압축할 MIME 타입 설정
            compression.setMimeTypes(new String[]{
                    "text/html",
                    "text/xml",
                    "text/plain",
                    "text/css",
                    "text/javascript",
                    "application/javascript",
                    "application/json",
                    "application/xml"
            });

            factory.setCompression(compression);
        };
    }
}
