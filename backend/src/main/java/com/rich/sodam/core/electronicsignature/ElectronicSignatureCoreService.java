package com.rich.sodam.core.electronicsignature;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

/** 요청·상태확인·최종검증을 상태머신과 함께 실행하는 전자서명 코어 진입점. */
public final class ElectronicSignatureCoreService {
    private final ElectronicSignatureGateway gateway;
    private final Clock clock;

    public ElectronicSignatureCoreService(ElectronicSignatureGateway gateway, Clock clock) {
        this.gateway = Objects.requireNonNull(gateway, "gateway");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public ElectronicSignatureProcess request(ElectronicSignatureRequest request) {
        Objects.requireNonNull(request, "request");
        requireConfiguredProvider(request.provider());

        Instant requestedAt = clock.instant();
        ElectronicSignatureReceipt receipt = gateway.request(request);
        ElectronicSignatureProcess process =
                ElectronicSignatureProcess.create(request.provider(), request.signer());
        process.markRequested(
                receipt,
                requestedAt,
                requestedAt.plusSeconds(request.expiresInSeconds()));
        return process;
    }

    public ElectronicSignatureStatus refresh(ElectronicSignatureProcess process) {
        requireProcess(process);
        ElectronicSignatureStatus status = gateway.getStatus(process.receiptId());
        process.observe(status);
        return status;
    }

    public VerificationDecision verify(ElectronicSignatureProcess process) {
        requireProcess(process);
        Instant now = clock.instant();
        process.beginVerification(now);
        ElectronicSignatureVerification verification = gateway.verify(process.receiptId());
        return process.applyVerification(verification, clock.instant());
    }

    private void requireProcess(ElectronicSignatureProcess process) {
        Objects.requireNonNull(process, "process");
        requireConfiguredProvider(process.provider());
        if (process.receiptId() == null) {
            throw new IllegalStateException("전자서명 공급자 요청이 아직 생성되지 않았습니다.");
        }
    }

    private void requireConfiguredProvider(ElectronicSignatureProvider requestedProvider) {
        if (gateway.provider() != requestedProvider) {
            throw new IllegalArgumentException("설정된 전자서명 공급자와 요청 공급자가 다릅니다.");
        }
    }
}
