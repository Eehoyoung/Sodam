package com.rich.sodam.core.electronicsignature;

/** 공급자 검증 응답에서 필요한 최소 PII만 투영한 값. */
public record VerifiedSignerIdentity(String name, String phone, String birthday) {

    public VerifiedSignerIdentity {
        name = IdentityNormalizer.name(name);
        phone = IdentityNormalizer.phone(phone);
        birthday = IdentityNormalizer.birthday(birthday);
    }
}
