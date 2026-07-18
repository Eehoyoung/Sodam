package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureCoreService;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureGateway;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
@ConditionalOnBean(ElectronicSignatureGateway.class)
public class ElectronicSignatureCoreConfiguration {

    @Bean
    ElectronicSignatureCoreService electronicSignatureCoreService(
            ElectronicSignatureGateway gateway) {
        return new ElectronicSignatureCoreService(gateway, Clock.systemUTC());
    }
}
