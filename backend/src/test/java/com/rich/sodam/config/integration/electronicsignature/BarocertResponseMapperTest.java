package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.core.electronicsignature.ProviderSignatureStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class BarocertResponseMapperTest {

    @Test
    void mapsProviderSpecificStates() {
        assertThat(BarocertResponseMapper.status(ElectronicSignatureProvider.NAVER, 3))
                .isEqualTo(ProviderSignatureStatus.DECLINED);
        assertThat(BarocertResponseMapper.status(ElectronicSignatureProvider.KAKAO, 3))
                .isEqualTo(ProviderSignatureStatus.FAILED);
        assertThat(BarocertResponseMapper.tossVerificationStatus("1"))
                .isEqualTo(ProviderSignatureStatus.COMPLETED);
        assertThat(BarocertResponseMapper.tossVerificationStatus("SUCCESS"))
                .isEqualTo(ProviderSignatureStatus.COMPLETED);
    }

    @Test
    void parsesBarocertDateInKoreaTimeAndFailsClosedForMalformedDate() {
        assertThat(BarocertResponseMapper.instant("20260717120000"))
                .isEqualTo(Instant.parse("2026-07-17T03:00:00Z"));
        assertThat(BarocertResponseMapper.instant("not-a-date")).isNull();
    }
}
