package com.rich.sodam.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class WebConfigSecurityTest {

    @Test
    void productionDoesNotTrustDevelopmentOriginsButKeepsExplicitDeploymentOrigin() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("sodam.cors.allowed-origins", "https://console.sodam.example");
        environment.setActiveProfiles("prod");
        WebConfig config = new WebConfig(environment);
        config.setAllowedOriginsCsv("https://console.sodam.example");

        var cors = config.corsConfiguration();

        assertThat(cors.checkOrigin("http://localhost:3000")).isNull();
        assertThat(cors.checkOrigin("https://console.sodam.example"))
                .isEqualTo("https://console.sodam.example");
    }

    @Test
    void developmentKeepsLocalOriginsForTheReactNativeToolchain() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        WebConfig config = new WebConfig(environment);

        assertThat(config.corsConfiguration().checkOrigin("http://localhost:3000"))
                .isEqualTo("http://localhost:3000");
    }
}
