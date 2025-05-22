
package com.rich.sodam.exception;

/**
 * 유효하지 않은 토큰에 대한 예외
 * JWT 토큰 검증 실패 시 발생하는 예외입니다.
 */
public class InvalidTokenException extends BusinessException {

    /**
     * 기본 메시지와 함께 예외를 생성합니다.
     */
    public InvalidTokenException() {
        super("유효하지 않은 토큰입니다.", "INVALID_TOKEN");
    }

    /**
     * 지정된 메시지와 함께 예외를 생성합니다.
     *
     * @param message 예외 메시지
     */
    public InvalidTokenException(String message) {
        super(message, "INVALID_TOKEN");
    }

    /**
     * 토큰 만료 예외를 생성합니다.
     *
     * @return 토큰 만료 예외
     */
    public static InvalidTokenException expired() {
        return new InvalidTokenException("토큰이 만료되었습니다.");
    }

    /**
     * 토큰 서명 예외를 생성합니다.
     *
     * @return 토큰 서명 예외
     */
    public static InvalidTokenException invalidSignature() {
        return new InvalidTokenException("유효하지 않은 토큰 서명입니다.");
    }

    /**
     * 잘못된 형식의 토큰 예외를 생성합니다.
     *
     * @return 잘못된 형식의 토큰 예외
     */
    public static InvalidTokenException malformed() {
        return new InvalidTokenException("잘못된 형식의 토큰입니다.");
    }

    /**
     * 토큰 처리 중 오류 발생 시 예외를 생성합니다.
     *
     * @param cause 원인 예외
     * @return 토큰 처리 예외
     */
    public static InvalidTokenException withCause(Throwable cause) {
        InvalidTokenException exception = new InvalidTokenException("토큰 처리 중 오류가 발생했습니다.");
        exception.initCause(cause);
        return exception;
    }
}