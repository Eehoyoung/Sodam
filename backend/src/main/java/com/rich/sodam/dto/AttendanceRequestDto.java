package com.rich.sodam.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRequestDto {

    private Long employeeId;    // 직원 ID

    private Long storeId;       // 매장 ID

    private Double latitude;    // 현재 위도

    private Double longitude;   // 현재 경도

}