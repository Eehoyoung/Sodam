package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureGateway;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureReceipt;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureRequest;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureStatus;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureVerification;
import com.rich.sodam.core.electronicsignature.ProviderSignatureStatus;
import com.rich.sodam.core.electronicsignature.SignerIdentity;
import com.rich.sodam.core.electronicsignature.VerifiedSignerIdentity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** 개발·CI에서 외부 호출 없이 전자서명 상태 흐름을 검증하는 메모리 어댑터. */
@Component
@ConditionalOnProperty(
        prefix = "sodam.integration.electronic-signature",
        name = "mode",
        havingValue = "mock")
public class MockElectronicSignatureGateway implements ElectronicSignatureGateway {
    private final ElectronicSignatureProvider provider;
    private final String allowedReturnScheme;
    private final Clock clock;
    private final Map<String, MockRecord> records = new ConcurrentHashMap<>();

    @Autowired
    public MockElectronicSignatureGateway(IntegrationProperties properties) {
        this(properties, Clock.systemUTC());
    }

    MockElectronicSignatureGateway(IntegrationProperties properties, Clock clock) {
        IntegrationProperties.ElectronicSignature config = properties.getElectronicSignature();
        this.provider = ElectronicSignatureProvider.parse(config.getProvider());
        this.allowedReturnScheme = validateAllowedScheme(config.getAllowedReturnScheme());
        this.clock = clock;
    }

    @Override
    public ElectronicSignatureProvider provider() {
        return provider;
    }

    @Override
    public ElectronicSignatureReceipt request(ElectronicSignatureRequest request) {
        requireConfiguredProvider(request.provider());
        validateReturnScheme(request);
        Instant requestedAt = clock.instant();
        records.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(requestedAt));

        String receiptId = UUID.randomUUID().toString().replace("-", "");
        MockRecord record = new MockRecord(
                request.signer(),
                request.documentDigest().hex(),
                requestedAt,
                requestedAt.plusSeconds(request.expiresInSeconds()));
        records.put(receiptId, record);
        return new ElectronicSignatureReceipt(
                receiptId,
                request.appToApp() ? URI.create(request.returnUrl()).getScheme() : null,
                null);
    }

    @Override
    public ElectronicSignatureStatus getStatus(String receiptId) {
        MockRecord record = record(receiptId);
        ProviderSignatureStatus status = clock.instant().isAfter(record.expiresAt())
                ? ProviderSignatureStatus.EXPIRED
                : ProviderSignatureStatus.COMPLETED;
        return new ElectronicSignatureStatus(
                status,
                record.requestedAt(),
                record.requestedAt(),
                status == ProviderSignatureStatus.COMPLETED ? record.requestedAt() : null,
                record.expiresAt());
    }

    @Override
    public ElectronicSignatureVerification verify(String receiptId) {
        MockRecord record = record(receiptId);
        if (clock.instant().isAfter(record.expiresAt())) {
            return new ElectronicSignatureVerification(
                    ProviderSignatureStatus.EXPIRED, null, null);
        }
        SignerIdentity signer = record.signer();
        String signedData = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("mock:" + provider + ":" + record.documentHash())
                        .getBytes(StandardCharsets.UTF_8));
        return new ElectronicSignatureVerification(
                ProviderSignatureStatus.COMPLETED,
                new VerifiedSignerIdentity(signer.name(), signer.phone(), signer.birthday()),
                signedData);
    }

    private MockRecord record(String receiptId) {
        if (receiptId == null || receiptId.isBlank()) {
            throw new IllegalArgumentException("전자서명 접수 ID가 비어 있습니다.");
        }
        MockRecord record = records.get(receiptId);
        if (record == null) {
            throw new IllegalArgumentException("존재하지 않는 전자서명 접수 ID입니다.");
        }
        return record;
    }

    private void requireConfiguredProvider(ElectronicSignatureProvider requestedProvider) {
        if (provider != requestedProvider) {
            throw new IllegalArgumentException("설정된 전자서명 공급자와 요청 공급자가 다릅니다.");
        }
    }

    private void validateReturnScheme(ElectronicSignatureRequest request) {
        if (!request.appToApp()) return;
        String scheme = URI.create(request.returnUrl()).getScheme();
        if (!allowedReturnScheme.equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("허용되지 않은 앱 복귀 스킴입니다.");
        }
    }

    static String validateAllowedScheme(String scheme) {
        String value = scheme == null ? "" : scheme.trim();
        if (!value.matches("[A-Za-z][A-Za-z0-9+.-]*")
                || value.equalsIgnoreCase("http")
                || value.equalsIgnoreCase("https")) {
            throw new IllegalStateException("전자서명 앱 복귀 스킴 설정이 올바르지 않습니다.");
        }
        return value;
    }

    private record MockRecord(
            SignerIdentity signer,
            String documentHash,
            Instant requestedAt,
            Instant expiresAt) {
    }
}
