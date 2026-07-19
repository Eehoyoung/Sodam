package com.rich.sodam.config;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.SensitiveReferenceKeySource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * {@code core.electronicsignature}가 {@code config.integration.IntegrationProperties}를
 * 직접 참조하지 않도록 하는 어댑터 (WP-10, LayerDependencyTest 준수).
 *
 * core는 {@link SensitiveReferenceKeySource} 포트만 알고, 실제 설정값 조립은 이 config
 * 계층이 담당한다 — 동작/값은 기존과 완전히 동일하다.
 */
@Configuration
public class ElectronicSignatureCryptoConfig {

    @Bean
    public SensitiveReferenceKeySource sensitiveReferenceKeySource(IntegrationProperties properties) {
        IntegrationProperties.ElectronicSignature c = properties.getElectronicSignature();
        return new SensitiveReferenceKeySource() {
            @Override
            public String refEncryptionKey() {
                return c.getRefEncryptionKey();
            }

            @Override
            public String refHmacPepper() {
                return c.getRefHmacPepper();
            }

            @Override
            public boolean live() {
                return c.resolvedMode() == IntegrationProperties.Mode.LIVE;
            }
        };
    }
}
