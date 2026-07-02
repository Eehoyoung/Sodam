package com.rich.sodam.domain;

import com.rich.sodam.config.crypto.StringCryptoConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class MasterProfile {

    @Id
    private Long id;  // User의 ID와 동일

    @OneToOne
    @MapsId  // User의 ID를 PK로 사용 (별도의 ID 생성 없음)
    @JoinColumn(name = "user_id")
    private User user;

    // 사장 추가 정보가 필요하다면 여기에 추가
    @Convert(converter = StringCryptoConverter.class) // 사업자등록번호 PII 암호화 저장
    @Column(length = 255)
    private String businessLicenseNumber;

    public MasterProfile(User user) {
        this.user = user;
    }

    public MasterProfile(User user, String businessLicenseNumber) {
        this.user = user;
        this.businessLicenseNumber = businessLicenseNumber;
    }
}