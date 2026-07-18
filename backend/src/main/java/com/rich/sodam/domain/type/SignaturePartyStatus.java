package com.rich.sodam.domain.type;

public enum SignaturePartyStatus {
    WAITING, REQUEST_QUEUED, PENDING, PROVIDER_COMPLETED, VERIFY_QUEUED, VERIFYING,
    VERIFIED, EXPIRED, DECLINED, FAILED, CANCELLED, MANUAL_REISSUE_REQUIRED;

    public boolean terminal() {
        return this == VERIFIED || this == EXPIRED || this == DECLINED || this == FAILED
                || this == CANCELLED || this == MANUAL_REISSUE_REQUIRED;
    }
}
