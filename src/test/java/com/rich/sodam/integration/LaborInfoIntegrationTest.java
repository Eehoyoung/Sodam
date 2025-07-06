package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.dto.response.LaborInfoResponseDto;
import com.rich.sodam.repository.LaborInfoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LaborInfoIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LaborInfoRepository laborInfoRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("노무 정보 생성 통합 테스트")
    void createLaborInfo() throws Exception {
        // given
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "test-image.jpg",
                "image/jpeg",
                "test image content".getBytes()
        );

        // when & then
        mockMvc.perform(multipart("/api/labor-info")
                        .file(image)
                        .param("title", "통합 테스트 노무 정보")
                        .param("content", "통합 테스트 내용입니다.")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("통합 테스트 노무 정보")))
                .andExpect(jsonPath("$.content", is("통합 테스트 내용입니다.")))
                .andExpect(jsonPath("$.imagePath", notNullValue()));

        // 데이터베이스에 저장되었는지 확인
        List<LaborInfo> laborInfos = laborInfoRepository.findAll();
        Optional<LaborInfo> createdLaborInfo = laborInfos.stream()
                .filter(info -> "통합 테스트 노무 정보".equals(info.getTitle()))
                .findFirst();

        assertThat(createdLaborInfo).isPresent();
        assertThat(createdLaborInfo.get().getContent()).isEqualTo("통합 테스트 내용입니다.");
    }

    @Test
    @DisplayName("노무 정보 조회 통합 테스트")
    void getLaborInfo() throws Exception {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("조회 테스트 노무 정보");
        laborInfo.setContent("조회 테스트 내용입니다.");
        laborInfo.setImagePath("uploads/test-image.jpg");
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        // when & then
        mockMvc.perform(get("/api/labor-info/{id}", savedLaborInfo.getId()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(savedLaborInfo.getId().intValue())))
                .andExpect(jsonPath("$.title", is("조회 테스트 노무 정보")))
                .andExpect(jsonPath("$.content", is("조회 테스트 내용입니다.")))
                .andExpect(jsonPath("$.imagePath", is("uploads/test-image.jpg")));
    }

    @Test
    @DisplayName("노무 정보 전체 조회 통합 테스트")
    void getAllLaborInfos() throws Exception {
        // given - data.sql에서 기본 데이터 로드됨

        // when & then
        mockMvc.perform(get("/api/labor-info"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].title", notNullValue()))
                .andExpect(jsonPath("$[0].content", notNullValue()));
    }

    @Test
    @DisplayName("최근 노무 정보 조회 통합 테스트")
    void getRecentLaborInfos() throws Exception {
        // given - data.sql에서 기본 데이터 로드됨

        // when & then
        mockMvc.perform(get("/api/labor-info/recent"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(lessThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].title", notNullValue()))
                .andExpect(jsonPath("$[0].content", notNullValue()));
    }

    @Test
    @DisplayName("노무 정보 수정 통합 테스트")
    void updateLaborInfo() throws Exception {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("수정 전 노무 정보");
        laborInfo.setContent("수정 전 내용입니다.");
        laborInfo.setImagePath("uploads/old-image.jpg");
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        MockMultipartFile image = new MockMultipartFile(
                "image",
                "updated-image.jpg",
                "image/jpeg",
                "updated image content".getBytes()
        );

        // when & then
        mockMvc.perform(multipart("/api/labor-info/{id}", savedLaborInfo.getId())
                        .file(image)
                        .param("title", "수정 후 노무 정보")
                        .param("content", "수정 후 내용입니다.")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(savedLaborInfo.getId().intValue())))
                .andExpect(jsonPath("$.title", is("수정 후 노무 정보")))
                .andExpect(jsonPath("$.content", is("수정 후 내용입니다.")))
                .andExpect(jsonPath("$.imagePath", not("uploads/old-image.jpg")));

        // 데이터베이스에 수정되었는지 확인
        Optional<LaborInfo> updatedLaborInfo = laborInfoRepository.findById(savedLaborInfo.getId());
        assertThat(updatedLaborInfo).isPresent();
        assertThat(updatedLaborInfo.get().getTitle()).isEqualTo("수정 후 노무 정보");
        assertThat(updatedLaborInfo.get().getContent()).isEqualTo("수정 후 내용입니다.");
        assertThat(updatedLaborInfo.get().getImagePath()).isNotEqualTo("uploads/old-image.jpg");
    }

    @Test
    @DisplayName("노무 정보 삭제 통합 테스트")
    void deleteLaborInfo() throws Exception {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("삭제할 노무 정보");
        laborInfo.setContent("삭제할 내용입니다.");
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        // when & then
        mockMvc.perform(delete("/api/labor-info/{id}", savedLaborInfo.getId()))
                .andDo(print())
                .andExpect(status().isNoContent());

        // 데이터베이스에서 삭제되었는지 확인
        Optional<LaborInfo> deletedLaborInfo = laborInfoRepository.findById(savedLaborInfo.getId());
        assertThat(deletedLaborInfo).isEmpty();
    }

    @Test
    @DisplayName("노무 정보 생성 후 조회 통합 테스트")
    void createAndGetLaborInfo() throws Exception {
        // given
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "test-image.jpg",
                "image/jpeg",
                "test image content".getBytes()
        );

        // when - 생성
        MvcResult createResult = mockMvc.perform(multipart("/api/labor-info")
                        .file(image)
                        .param("title", "생성 후 조회 테스트")
                        .param("content", "생성 후 조회 테스트 내용입니다.")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andExpect(status().isOk())
                .andReturn();

        // 생성된 노무 정보의 ID 추출
        String createResponseJson = createResult.getResponse().getContentAsString();
        LaborInfoResponseDto createdDto = objectMapper.readValue(createResponseJson, LaborInfoResponseDto.class);
        Long createdId = createdDto.getId();

        // then - 조회
        mockMvc.perform(get("/api/labor-info/{id}", createdId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(createdId.intValue())))
                .andExpect(jsonPath("$.title", is("생성 후 조회 테스트")))
                .andExpect(jsonPath("$.content", is("생성 후 조회 테스트 내용입니다.")));
    }
}
