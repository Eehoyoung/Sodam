package com.rich.sodam.core.electronicsignature;

public record VerificationDecision(boolean accepted, VerificationFailureReason reason) {
    public static VerificationDecision acceptedDecision() {
        return new VerificationDecision(true, VerificationFailureReason.NONE);
    }

    public static VerificationDecision rejected(VerificationFailureReason reason) {
        return new VerificationDecision(false, reason);
    }
}
