package com.rich.sodam.core.electronicsignature;

/** 공급자 요청에만 사용되는 PII. 로그·일반 API 응답에 포함하면 안 된다. */
public record SignerIdentity(String name, String phone, String birthday) {

    public SignerIdentity {
        name = IdentityNormalizer.name(name);
        phone = IdentityNormalizer.phone(phone);
        birthday = IdentityNormalizer.birthday(birthday);
    }

    public boolean matches(VerifiedSignerIdentity verified) {
        return verified != null
                && name.equals(verified.name())
                && phone.equals(verified.phone())
                && birthday.equals(verified.birthday());
    }
}
