package com.rich.sodam.controller;

import com.rich.sodam.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.NoSuchElementException;

/**
 * API 응답 표준화 및 예외 처리 테스트용 컨트롤러
 */
@Hidden
@RestController
@RequestMapping("/api/test")
public class TestController {

    /**
     * 성공 응답 테스트
     */
    @GetMapping("/success")
    public ResponseEntity<ApiResponse<String>> testSuccess() {
        return ResponseEntity.ok(ApiResponse.success("테스트 성공", "성공적으로 처리되었습니다."));
    }

    /**
     * IllegalArgumentException 테스트
     */
    @GetMapping("/illegal-argument")
    public ResponseEntity<ApiResponse<String>> testIllegalArgument(@RequestParam String value) {
        if ("error".equals(value)) {
            throw new IllegalArgumentException("잘못된 인수입니다: " + value);
        }
        return ResponseEntity.ok(ApiResponse.success("정상 처리", value));
    }

    /**
     * NoSuchElementException 테스트
     */
    @GetMapping("/no-such-element")
    public ResponseEntity<ApiResponse<String>> testNoSuchElement(@RequestParam Long id) {
        if (id == 999L) {
            throw new NoSuchElementException("ID " + id + "에 해당하는 요소를 찾을 수 없습니다.");
        }
        return ResponseEntity.ok(ApiResponse.success("요소 조회 성공", "ID: " + id));
    }

    /**
     * 일반 Exception 테스트
     */
    @GetMapping("/general-exception")
    public ResponseEntity<ApiResponse<String>> testGeneralException() {
        throw new RuntimeException("예상치 못한 오류가 발생했습니다.");
    }
}
