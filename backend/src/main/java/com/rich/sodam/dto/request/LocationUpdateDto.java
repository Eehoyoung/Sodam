package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateDto {

    private Integer radius;

    @Size(max = 200, message = "주소(fullAddress)는 최대 200자까지 허용됩니다.")
    @Pattern(regexp = "^[\\p{L}\\p{N}\\s,.-]*$", message = "주소(fullAddress)에 허용되지 않는 문자가 포함되어 있습니다.")
    private String fullAddress;

    private Double latitude;

    private Double longitude;

}
