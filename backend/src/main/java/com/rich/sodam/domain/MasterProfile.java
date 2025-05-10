package com.rich.sodam.domain;

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
    private String businessLicenseNumber;

    public MasterProfile(User user) {
        this.user = user;
    }

    public MasterProfile(User user, String businessLicenseNumber) {
        this.user = user;
        this.businessLicenseNumber = businessLicenseNumber;
    }
}