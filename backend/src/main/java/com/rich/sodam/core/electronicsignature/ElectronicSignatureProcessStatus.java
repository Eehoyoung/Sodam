package com.rich.sodam.core.electronicsignature;

public enum ElectronicSignatureProcessStatus {
    CREATED,
    PENDING,
    COMPLETED,
    VERIFIED,
    EXPIRED,
    DECLINED,
    FAILED;

    public boolean terminal() {
        return this == VERIFIED || this == EXPIRED || this == DECLINED || this == FAILED;
    }
}
