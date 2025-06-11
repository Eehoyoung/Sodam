package com.rich.sodam.controller;

import com.rich.sodam.dto.request.LaborInfoRequestDto;
import com.rich.sodam.dto.response.LaborInfoResponseDto;
import com.rich.sodam.service.LaborInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * 노무 정보 컨트롤러
 * 노무 정보에 대한 CRUD API를 제공합니다.
 */
@RestController
@RequestMapping("/api/labor-info")
@RequiredArgsConstructor
@Tag(name = "노무 정보", description = "노무 정보 관리 API")
public class LaborInfoController {

    private final LaborInfoService laborInfoService;

    @Operation(summary = "노무 정보 생성", description = "새로운 노무 정보를 생성합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "노무 정보 생성 성공",
                    content = @Content(schema = @Schema(implementation = LaborInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LaborInfoResponseDto> createLaborInfo(
            @Parameter(description = "노무 정보 생성 요청 DTO", required = true)
            @ModelAttribute LaborInfoRequestDto requestDto) throws IOException {
        LaborInfoResponseDto responseDto = laborInfoService.createLaborInfo(requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "노무 정보 조회", description = "ID로 노무 정보를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "노무 정보 조회 성공",
                    content = @Content(schema = @Schema(implementation = LaborInfoResponseDto.class))),
            @ApiResponse(responseCode = "404", description = "노무 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/{id}")
    public ResponseEntity<LaborInfoResponseDto> getLaborInfo(
            @Parameter(description = "노무 정보 ID", required = true)
            @PathVariable Long id) {
        LaborInfoResponseDto responseDto = laborInfoService.getLaborInfo(id);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "노무 정보 전체 조회", description = "모든 노무 정보를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "노무 정보 전체 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = LaborInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping
    public ResponseEntity<List<LaborInfoResponseDto>> getAllLaborInfos() {
        List<LaborInfoResponseDto> responseDtos = laborInfoService.getAllLaborInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "최근 노무 정보 조회", description = "최근 노무 정보 5개를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "최근 노무 정보 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = LaborInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/recent")
    public ResponseEntity<List<LaborInfoResponseDto>> getRecentLaborInfos() {
        List<LaborInfoResponseDto> responseDtos = laborInfoService.getRecentLaborInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "노무 정보 수정", description = "ID로 노무 정보를 수정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "노무 정보 수정 성공",
                    content = @Content(schema = @Schema(implementation = LaborInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "404", description = "노무 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LaborInfoResponseDto> updateLaborInfo(
            @Parameter(description = "노무 정보 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "노무 정보 수정 요청 DTO", required = true)
            @ModelAttribute LaborInfoRequestDto requestDto) throws IOException {
        LaborInfoResponseDto responseDto = laborInfoService.updateLaborInfo(id, requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "노무 정보 삭제", description = "ID로 노무 정보를 삭제합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "노무 정보 삭제 성공"),
            @ApiResponse(responseCode = "404", description = "노무 정보를 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLaborInfo(
            @Parameter(description = "노무 정보 ID", required = true)
            @PathVariable Long id) {
        laborInfoService.deleteLaborInfo(id);
        return ResponseEntity.noContent().build();
    }
}
