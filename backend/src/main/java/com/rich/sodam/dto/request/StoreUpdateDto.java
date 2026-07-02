package com.rich.sodam.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 매장 일반 정보 업데이트 DTO
 * 선택적으로 전달된 필드만 업데이트됩니다.
 */
@Getter
@Setter
@NoArgsConstructor
public class StoreUpdateDto {

    @Schema(description = "매장명", example = "카페 소담")
    @Size(max = 100, message = "매장명은 최대 100자까지 허용됩니다.")
    private String storeName;

    @Schema(description = "매장 전화번호", example = "02-1234-5678")
    @Size(max = 30, message = "전화번호는 최대 30자까지 허용됩니다.")
    private String storePhoneNumber;

    @Schema(description = "업종", example = "카페")
    @Size(max = 50, message = "업종은 최대 50자까지 허용됩니다.")
    private String businessType;

    @Schema(description = "전체 주소", example = "서울시 강남구 역삼동 123-45")
    @Size(max = 255, message = "주소는 최대 255자까지 허용됩니다.")
    private String fullAddress;

    @Schema(description = "도로명 주소")
    @Size(max = 255)
    private String roadAddress;

    @Schema(description = "지번 주소")
    @Size(max = 255)
    private String jibunAddress;

    @Schema(description = "반경(m)", example = "100")
    private Integer radius;

    @Schema(description = "매장 기준 시급", example = "9860")
    private Integer storeStandardHourWage;

    @Schema(description = "주소 지오코딩을 위한 쿼리(선택)", example = "서울시 강남구 테헤란로 123")
    private String query;

    @Schema(description = "급여 정산 주기(시작/마감/지급일). 전달 시 전체 교체")
    @Valid
    private PayrollCycleDto payrollCycle;
}
