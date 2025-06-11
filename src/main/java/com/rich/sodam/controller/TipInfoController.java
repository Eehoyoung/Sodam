package com.rich.sodam.controller;

import com.rich.sodam.dto.request.TipInfoRequestDto;
import com.rich.sodam.dto.response.TipInfoResponseDto;
import com.rich.sodam.service.TipInfoService;
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
 * 소상공인 꿀팁 컨트롤러
 * 소상공인 꿀팁에 대한 CRUD API를 제공합니다.
 */
@RestController
@RequestMapping("/api/tip-info")
@RequiredArgsConstructor
@Tag(name = "소상공인 꿀팁", description = "소상공인 꿀팁 관리 API")
public class TipInfoController {

    private final TipInfoService tipInfoService;

    @Operation(summary = "소상공인 꿀팁 생성", description = "새로운 소상공인 꿀팁을 생성합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "소상공인 꿀팁 생성 성공",
                    content = @Content(schema = @Schema(implementation = TipInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TipInfoResponseDto> createTipInfo(
            @Parameter(description = "소상공인 꿀팁 생성 요청 DTO", required = true)
            @ModelAttribute TipInfoRequestDto requestDto) throws IOException {
        TipInfoResponseDto responseDto = tipInfoService.createTipInfo(requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "소상공인 꿀팁 조회", description = "ID로 소상공인 꿀팁을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "소상공인 꿀팁 조회 성공",
                    content = @Content(schema = @Schema(implementation = TipInfoResponseDto.class))),
            @ApiResponse(responseCode = "404", description = "소상공인 꿀팁을 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/{id}")
    public ResponseEntity<TipInfoResponseDto> getTipInfo(
            @Parameter(description = "소상공인 꿀팁 ID", required = true)
            @PathVariable Long id) {
        TipInfoResponseDto responseDto = tipInfoService.getTipInfo(id);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "소상공인 꿀팁 전체 조회", description = "모든 소상공인 꿀팁을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "소상공인 꿀팁 전체 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = TipInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping
    public ResponseEntity<List<TipInfoResponseDto>> getAllTipInfos() {
        List<TipInfoResponseDto> responseDtos = tipInfoService.getAllTipInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "최근 소상공인 꿀팁 조회", description = "최근 소상공인 꿀팁 5개를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "최근 소상공인 꿀팁 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = TipInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/recent")
    public ResponseEntity<List<TipInfoResponseDto>> getRecentTipInfos() {
        List<TipInfoResponseDto> responseDtos = tipInfoService.getRecentTipInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "제목으로 소상공인 꿀팁 검색", description = "제목에 특정 키워드가 포함된 소상공인 꿀팁을 검색합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "소상공인 꿀팁 검색 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = TipInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/search/title")
    public ResponseEntity<List<TipInfoResponseDto>> searchTipInfosByTitle(
            @Parameter(description = "검색 키워드", required = true)
            @RequestParam String keyword) {
        List<TipInfoResponseDto> responseDtos = tipInfoService.searchTipInfosByTitle(keyword);
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "내용으로 소상공인 꿀팁 검색", description = "내용에 특정 키워드가 포함된 소상공인 꿀팁을 검색합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "소상공인 꿀팁 검색 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = TipInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/search/content")
    public ResponseEntity<List<TipInfoResponseDto>> searchTipInfosByContent(
            @Parameter(description = "검색 키워드", required = true)
            @RequestParam String keyword) {
        List<TipInfoResponseDto> responseDtos = tipInfoService.searchTipInfosByContent(keyword);
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "소상공인 꿀팁 수정", description = "ID로 소상공인 꿀팁을 수정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "소상공인 꿀팁 수정 성공",
                    content = @Content(schema = @Schema(implementation = TipInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "404", description = "소상공인 꿀팁을 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TipInfoResponseDto> updateTipInfo(
            @Parameter(description = "소상공인 꿀팁 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "소상공인 꿀팁 수정 요청 DTO", required = true)
            @ModelAttribute TipInfoRequestDto requestDto) throws IOException {
        TipInfoResponseDto responseDto = tipInfoService.updateTipInfo(id, requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "소상공인 꿀팁 삭제", description = "ID로 소상공인 꿀팁을 삭제합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "소상공인 꿀팁 삭제 성공"),
            @ApiResponse(responseCode = "404", description = "소상공인 꿀팁을 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTipInfo(
            @Parameter(description = "소상공인 꿀팁 ID", required = true)
            @PathVariable Long id) {
        tipInfoService.deleteTipInfo(id);
        return ResponseEntity.noContent().build();
    }
}
