package com.rich.sodam.security.kakaoAuth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class KakaoProfile {

    @JsonProperty("id")
    public Long id;

    @JsonProperty("connected_at")
    public String connectedAt;

    @JsonProperty("properties")
    public Properties properties;

    @JsonProperty("kakao_account")
    public KakaoAccount kakaoAccount;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Properties {
        @JsonProperty("nickname")
        public String nickname;

        @JsonProperty("profile_image")
        public String profileImage;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class KakaoAccount {
        @JsonProperty("profile_nickname_needs_agreement")
        public Boolean profileNicknameNeedsAgreement;

        @JsonProperty("profile_image_needs_agreement")
        public Boolean profileImageNeedsAgreement;

        @JsonProperty("name_needs_agreement")
        public Boolean nameNeedsAgreement;

        @JsonProperty("name")
        public String name;

        @JsonProperty("profile")
        public Profile profile;

        @JsonProperty("has_email")
        public Boolean hasEmail;

        @JsonProperty("email_needs_agreement")
        public Boolean emailNeedsAgreement;

        @JsonProperty("is_email_valid")
        public Boolean isEmailValid;

        @JsonProperty("is_email_verified")
        public Boolean isEmailVerified;

        @JsonProperty("email")
        public String email;

        @Data
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Profile {
            @JsonProperty("nickname")
            public String nickname;

            @JsonProperty("thumbnail_image_url")
            public String thumbnailImageUrl;

            @JsonProperty("profile_image_url")
            public String profileImageUrl;

            @JsonProperty("is_default_image")
            public Boolean isDefaultImage;
        }
    }
}