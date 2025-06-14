package com.rich.sodam.dto;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사장 프로필 응답을 위한 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MasterProfileResponseDto {
    private Long id;
    private String name;
    private String email;
    private String businessLicenseNumber;

    /**
     * MasterProfile 엔티티를 MasterProfileResponseDto로 변환
     */
    public static MasterProfileResponseDto fromEntity(MasterProfile masterProfile) {
        User user = masterProfile.getUser();

        MasterProfileResponseDto dto = new MasterProfileResponseDto();
        dto.setId(masterProfile.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setBusinessLicenseNumber(masterProfile.getBusinessLicenseNumber());

        return dto;
    }
}
