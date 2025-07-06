package com.rich.sodam.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 표준화된 API 응답 DTO
 * 모든 API 응답을 일관된 JSON 형식으로 통일하기 위한 클래스
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    /**
     * 요청 성공 여부
     */
    private final boolean success;

    /**
     * 응답 메시지
     */
    private final String message;

    /**
     * 응답 데이터 (제네릭 타입)
     */
    private final T data;

    /**
     * 에러 코드 (에러 시에만 포함)
     */
    private final String errorCode;

    /**
     * 응답 생성 시간
     */
    private final String timestamp;

    /**
     * 생성자
     */
    private ApiResponse(boolean success, String message, T data, String errorCode) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.errorCode = errorCode;
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    /**
     * 성공 응답 생성 (데이터 포함)
     *
     * @param data 응답 데이터
     * @param <T>  데이터 타입
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "요청이 성공적으로 처리되었습니다.", data, null);
    }

    /**
     * 성공 응답 생성 (메시지와 데이터 포함)
     *
     * @param message 성공 메시지
     * @param data    응답 데이터
     * @param <T>     데이터 타입
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    /**
     * 성공 응답 생성 (메시지만 포함)
     *
     * @param message 성공 메시지
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, message, null, null);
    }

    /**
     * 에러 응답 생성
     *
     * @param errorCode 에러 코드
     * @param message   에러 메시지
     * @return 에러 응답
     */
    public static <T> ApiResponse<T> error(String errorCode, String message) {
        return new ApiResponse<>(false, message, null, errorCode);
    }

    /**
     * 에러 응답 생성 (데이터 포함)
     *
     * @param errorCode 에러 코드
     * @param message   에러 메시지
     * @param data      에러 관련 데이터
     * @param <T>       데이터 타입
     * @return 에러 응답
     */
    public static <T> ApiResponse<T> error(String errorCode, String message, T data) {
        return new ApiResponse<>(false, message, data, errorCode);
    }
}
