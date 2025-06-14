package com.rich.sodam.controller;

import com.rich.sodam.dto.request.PolicyInfoRequestDto;
import com.rich.sodam.dto.response.PolicyInfoResponseDto;
import com.rich.sodam.service.PolicyInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * 국가정책 정보 컨트롤러
 * 국가정책 정보에 대한 CRUD API를 제공합니다.
 */
@RestController
@RequestMapping("/api/policy-info")
@RequiredArgsConstructor
@Tag(name = "국가정책 정보", description = "국가정책 정보 관리 API")
public class PolicyInfoController {

    private final PolicyInfoService policyInfoService;

    @Operation(summary = "국가정책 정보 생성", description = "새로운 국가정책 정보를 생성합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "국가정책 정보 생성 성공",
                    content = @Content(schema = @Schema(implementation = PolicyInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PolicyInfoResponseDto> createPolicyInfo(
            @Parameter(description = "국가정책 정보 생성 요청 DTO", required = true)
            @ModelAttribute PolicyInfoRequestDto requestDto) throws IOException {
        PolicyInfoResponseDto responseDto = policyInfoService.createPolicyInfo(requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "국가정책 정보 조회", description = "ID로 국가정책 정보를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "국가정책 정보 조회 성공",
                    content = @Content(schema = @Schema(implementation = PolicyInfoResponseDto.class))),
            @ApiResponse(responseCode = "404", description = "국가정책 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/{id}")
    public ResponseEntity<PolicyInfoResponseDto> getPolicyInfo(
            @Parameter(description = "국가정책 정보 ID", required = true)
            @PathVariable Long id) {
        PolicyInfoResponseDto responseDto = policyInfoService.getPolicyInfo(id);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "국가정책 정보 전체 조회 (페이지네이션 없음)",
            description = "모든 국가정책 정보를 조회합니다. 데이터가 많을 경우 /api/policy-info/paged 엔드포인트 사용을 권장합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "국가정책 정보 전체 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PolicyInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping
    public ResponseEntity<List<PolicyInfoResponseDto>> getAllPolicyInfos() {
        List<PolicyInfoResponseDto> responseDtos = policyInfoService.getAllPolicyInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "국가정책 정보 페이지네이션 조회",
            description = "페이지네이션을 적용하여 국가정책 정보를 조회합니다. 서버 리소스 최적화를 위해 권장되는 방식입니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "국가정책 정보 페이지네이션 조회 성공",
                    content = @Content(schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/paged")
    public ResponseEntity<Page<PolicyInfoResponseDto>> getPolicyInfosWithPagination(
            @Parameter(description = "페이지 정보 (페이지 번호, 페이지 크기, 정렬 정보 등)")
            @PageableDefault(size = 10, sort = "id") Pageable pageable) {
        Page<PolicyInfoResponseDto> responseDtos = policyInfoService.getPolicyInfosWithPagination(pageable);
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "최근 국가정책 정보 조회", description = "최근 국가정책 정보 5개를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "최근 국가정책 정보 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PolicyInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/recent")
    public ResponseEntity<List<PolicyInfoResponseDto>> getRecentPolicyInfos() {
        List<PolicyInfoResponseDto> responseDtos = policyInfoService.getRecentPolicyInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "국가정책 정보 수정", description = "ID로 국가정책 정보를 수정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "국가정책 정보 수정 성공",
                    content = @Content(schema = @Schema(implementation = PolicyInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "404", description = "국가정책 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PolicyInfoResponseDto> updatePolicyInfo(
            @Parameter(description = "국가정책 정보 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "국가정책 정보 수정 요청 DTO", required = true)
            @ModelAttribute PolicyInfoRequestDto requestDto) throws IOException {
        PolicyInfoResponseDto responseDto = policyInfoService.updatePolicyInfo(id, requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "국가정책 정보 삭제", description = "ID로 국가정책 정보를 삭제합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "국가정책 정보 삭제 성공"),
            @ApiResponse(responseCode = "404", description = "국가정책 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePolicyInfo(
            @Parameter(description = "국가정책 정보 ID", required = true)
            @PathVariable Long id) {
        policyInfoService.deletePolicyInfo(id);
        return ResponseEntity.noContent().build();
    }
}
