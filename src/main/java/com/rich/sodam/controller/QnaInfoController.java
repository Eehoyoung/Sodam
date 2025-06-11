package com.rich.sodam.controller;

import com.rich.sodam.dto.request.QnaInfoRequestDto;
import com.rich.sodam.dto.response.QnaInfoResponseDto;
import com.rich.sodam.service.QnaInfoService;
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
 * 사이트 질문 컨트롤러
 * 사이트 질문에 대한 CRUD API를 제공합니다.
 */
@RestController
@RequestMapping("/api/qna-info")
@RequiredArgsConstructor
@Tag(name = "사이트 질문", description = "사이트 질문 관리 API")
public class QnaInfoController {

    private final QnaInfoService qnaInfoService;

    @Operation(summary = "사이트 질문 생성", description = "새로운 사이트 질문을 생성합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "사이트 질문 생성 성공",
                    content = @Content(schema = @Schema(implementation = QnaInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QnaInfoResponseDto> createQnaInfo(
            @Parameter(description = "사이트 질문 생성 요청 DTO", required = true)
            @ModelAttribute QnaInfoRequestDto requestDto) throws IOException {
        QnaInfoResponseDto responseDto = qnaInfoService.createQnaInfo(requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "사이트 질문 조회", description = "ID로 사이트 질문을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "사이트 질문 조회 성공",
                    content = @Content(schema = @Schema(implementation = QnaInfoResponseDto.class))),
            @ApiResponse(responseCode = "404", description = "사이트 질문을 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/{id}")
    public ResponseEntity<QnaInfoResponseDto> getQnaInfo(
            @Parameter(description = "사이트 질문 ID", required = true)
            @PathVariable Long id) {
        QnaInfoResponseDto responseDto = qnaInfoService.getQnaInfo(id);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "사이트 질문 전체 조회", description = "모든 사이트 질문을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "사이트 질문 전체 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = QnaInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping
    public ResponseEntity<List<QnaInfoResponseDto>> getAllQnaInfos() {
        List<QnaInfoResponseDto> responseDtos = qnaInfoService.getAllQnaInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "최근 사이트 질문 조회", description = "최근 사이트 질문 5개를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "최근 사이트 질문 조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = QnaInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/recent")
    public ResponseEntity<List<QnaInfoResponseDto>> getRecentQnaInfos() {
        List<QnaInfoResponseDto> responseDtos = qnaInfoService.getRecentQnaInfos();
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "제목으로 사이트 질문 검색", description = "제목에 특정 키워드가 포함된 사이트 질문을 검색합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "사이트 질문 검색 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = QnaInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/search/title")
    public ResponseEntity<List<QnaInfoResponseDto>> searchQnaInfosByTitle(
            @Parameter(description = "검색 키워드", required = true)
            @RequestParam String keyword) {
        List<QnaInfoResponseDto> responseDtos = qnaInfoService.searchQnaInfosByTitle(keyword);
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "질문 내용으로 사이트 질문 검색", description = "질문 내용에 특정 키워드가 포함된 사이트 질문을 검색합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "사이트 질문 검색 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = QnaInfoResponseDto.class)))),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping("/search/question")
    public ResponseEntity<List<QnaInfoResponseDto>> searchQnaInfosByQuestion(
            @Parameter(description = "검색 키워드", required = true)
            @RequestParam String keyword) {
        List<QnaInfoResponseDto> responseDtos = qnaInfoService.searchQnaInfosByQuestion(keyword);
        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "사이트 질문 수정", description = "ID로 사이트 질문을 수정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "사이트 질문 수정 성공",
                    content = @Content(schema = @Schema(implementation = QnaInfoResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "404", description = "사이트 질문을 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QnaInfoResponseDto> updateQnaInfo(
            @Parameter(description = "사이트 질문 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "사이트 질문 수정 요청 DTO", required = true)
            @ModelAttribute QnaInfoRequestDto requestDto) throws IOException {
        QnaInfoResponseDto responseDto = qnaInfoService.updateQnaInfo(id, requestDto);
        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "사이트 질문 삭제", description = "ID로 사이트 질문을 삭제합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "사이트 질문 삭제 성공"),
            @ApiResponse(responseCode = "404", description = "사이트 질문을 찾을 수 없음"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQnaInfo(
            @Parameter(description = "사이트 질문 ID", required = true)
            @PathVariable Long id) {
        qnaInfoService.deleteQnaInfo(id);
        return ResponseEntity.noContent().build();
    }
}
