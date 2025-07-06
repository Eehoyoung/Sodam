package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.dto.request.LaborInfoRequestDto;
import com.rich.sodam.dto.response.LaborInfoResponseDto;
import com.rich.sodam.service.LaborInfoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class LaborInfoControllerTest {

    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @Mock
    private LaborInfoService laborInfoService;

    @InjectMocks
    private LaborInfoController laborInfoController;

    private LaborInfoResponseDto testResponseDto;
    private List<LaborInfoResponseDto> testResponseDtoList;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders
                .standaloneSetup(laborInfoController)
                .build();

        // 테스트용 응답 DTO 생성
        testResponseDto = LaborInfoResponseDto.builder()
                .id(1L)
                .title("테스트 노무 정보")
                .content("테스트 내용입니다.")
                .imagePath("uploads/test-image.jpg")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // 테스트용 응답 DTO 리스트 생성
        LaborInfoResponseDto testResponseDto2 = LaborInfoResponseDto.builder()
                .id(2L)
                .title("두 번째 노무 정보")
                .content("두 번째 내용입니다.")
                .imagePath("uploads/test-image2.jpg")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testResponseDtoList = Arrays.asList(testResponseDto, testResponseDto2);
    }

    @Test
    @DisplayName("노무 정보 생성 API 테스트")
    void createLaborInfo() throws Exception {
        // given
        given(laborInfoService.createLaborInfo(any(LaborInfoRequestDto.class))).willReturn(testResponseDto);

        MockMultipartFile image = new MockMultipartFile(
                "image",
                "test-image.jpg",
                "image/jpeg",
                "test image content".getBytes()
        );

        // when & then
        mockMvc.perform(multipart("/api/labor-info")
                        .file(image)
                        .param("title", "테스트 노무 정보")
                        .param("content", "테스트 내용입니다.")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("테스트 노무 정보")))
                .andExpect(jsonPath("$.content", is("테스트 내용입니다.")))
                .andExpect(jsonPath("$.imagePath", is("uploads/test-image.jpg")));
    }

    @Test
    @DisplayName("노무 정보 조회 API 테스트")
    void getLaborInfo() throws Exception {
        // given
        given(laborInfoService.getLaborInfo(anyLong())).willReturn(testResponseDto);

        // when & then
        mockMvc.perform(get("/api/labor-info/1"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("테스트 노무 정보")))
                .andExpect(jsonPath("$.content", is("테스트 내용입니다.")))
                .andExpect(jsonPath("$.imagePath", is("uploads/test-image.jpg")));
    }

    @Test
    @DisplayName("노무 정보 전체 조회 API 테스트")
    void getAllLaborInfos() throws Exception {
        // given
        given(laborInfoService.getAllLaborInfos()).willReturn(testResponseDtoList);

        // when & then
        mockMvc.perform(get("/api/labor-info"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].title", is("테스트 노무 정보")))
                .andExpect(jsonPath("$[1].id", is(2)))
                .andExpect(jsonPath("$[1].title", is("두 번째 노무 정보")));
    }

    @Test
    @DisplayName("최근 노무 정보 조회 API 테스트")
    void getRecentLaborInfos() throws Exception {
        // given
        given(laborInfoService.getRecentLaborInfos()).willReturn(testResponseDtoList);

        // when & then
        mockMvc.perform(get("/api/labor-info/recent"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].title", is("테스트 노무 정보")))
                .andExpect(jsonPath("$[1].id", is(2)))
                .andExpect(jsonPath("$[1].title", is("두 번째 노무 정보")));
    }

    @Test
    @DisplayName("노무 정보 수정 API 테스트")
    void updateLaborInfo() throws Exception {
        // given
        given(laborInfoService.updateLaborInfo(anyLong(), any(LaborInfoRequestDto.class))).willReturn(testResponseDto);

        MockMultipartFile image = new MockMultipartFile(
                "image",
                "test-image.jpg",
                "image/jpeg",
                "test image content".getBytes()
        );

        // when & then
        mockMvc.perform(multipart("/api/labor-info/1")
                        .file(image)
                        .param("title", "수정된 노무 정보")
                        .param("content", "수정된 내용입니다.")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("테스트 노무 정보")))
                .andExpect(jsonPath("$.content", is("테스트 내용입니다.")))
                .andExpect(jsonPath("$.imagePath", is("uploads/test-image.jpg")));
    }

    @Test
    @DisplayName("노무 정보 삭제 API 테스트")
    void deleteLaborInfo() throws Exception {
        // given
        doNothing().when(laborInfoService).deleteLaborInfo(anyLong());

        // when & then
        mockMvc.perform(delete("/api/labor-info/1"))
                .andDo(print())
                .andExpect(status().isNoContent());
    }
}
