package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.UserGrade;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * 직원 정보 수정 요청 DTO
 * STORE-012: 직원 기본 정보, 직책 등 수정
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
public class EmployeeUpdateDto {

    /**
     * 직원 이름
     */
    @NotBlank(message = "이름은 필수 입력 항목입니다.")
    @Size(max = 50, message = "이름은 50자 이하로 입력해주세요.")
    private String name;

    /**
     * 직원 이메일
     */
    @NotBlank(message = "이메일은 필수 입력 항목입니다.")
    @Email(message = "올바른 이메일 형식을 입력해주세요.")
    @Size(max = 100, message = "이메일은 100자 이하로 입력해주세요.")
    private String email;

    /**
     * 직원 직책 (EMPLOYEE, NORMAL 등)
     */
    private UserGrade userGrade;

    /**
     * 전화번호 (선택사항)
     * 현재 User 엔티티에 없으므로 향후 확장을 위해 준비
     */
    @Size(max = 20, message = "전화번호는 20자 이하로 입력해주세요.")
    private String phoneNumber;

    /**
     * 생성자
     *
     * @param name      직원 이름
     * @param email     직원 이메일
     * @param userGrade 직원 직책
     */
    public EmployeeUpdateDto(String name, String email, UserGrade userGrade) {
        this.name = name;
        this.email = email;
        this.userGrade = userGrade;
    }

    /**
     * 전체 필드 생성자
     *
     * @param name        직원 이름
     * @param email       직원 이메일
     * @param userGrade   직원 직책
     * @param phoneNumber 전화번호
     */
    public EmployeeUpdateDto(String name, String email, UserGrade userGrade, String phoneNumber) {
        this.name = name;
        this.email = email;
        this.userGrade = userGrade;
        this.phoneNumber = phoneNumber;
    }
}
