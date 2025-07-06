package com.rich.sodam.service;

import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.dto.request.LaborInfoRequestDto;
import com.rich.sodam.dto.response.LaborInfoResponseDto;
import com.rich.sodam.repository.LaborInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LaborInfoServiceTest {

    private LaborInfoService laborInfoService;

    @Mock
    private LaborInfoRepository laborInfoRepository;

    @Mock
    private FileUploadService fileUploadService;

    private LaborInfo testLaborInfo;
    private LaborInfoRequestDto testRequestDto;
    private MultipartFile mockMultipartFile;

    @BeforeEach
    void setUp() {
        // 서비스 초기화
        laborInfoService = new LaborInfoService(laborInfoRepository, fileUploadService);

        // 테스트용 LaborInfo 엔티티 생성
        testLaborInfo = new LaborInfo();
        testLaborInfo.setId(1L);
        testLaborInfo.setTitle("테스트 노무 정보");
        testLaborInfo.setContent("테스트 내용입니다.");
        testLaborInfo.setImagePath("uploads/test-image.jpg");
        testLaborInfo.setCreatedAt(LocalDateTime.now());
        testLaborInfo.setUpdatedAt(LocalDateTime.now());

        // 테스트용 요청 DTO 생성
        testRequestDto = new LaborInfoRequestDto();
        testRequestDto.setTitle("테스트 노무 정보");
        testRequestDto.setContent("테스트 내용입니다.");

        // MultipartFile 모킹
        mockMultipartFile = mock(MultipartFile.class);
        when(mockMultipartFile.isEmpty()).thenReturn(false);
    }

    @Test
    @DisplayName("노무 정보 생성 테스트 - 이미지 없음")
    void createLaborInfoWithoutImage() throws IOException {
        // given
        testRequestDto.setImage(null);
        given(laborInfoRepository.save(any(LaborInfo.class))).willReturn(testLaborInfo);

        // when
        LaborInfoResponseDto result = laborInfoService.createLaborInfo(testRequestDto);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testLaborInfo.getId());
        assertThat(result.getTitle()).isEqualTo(testLaborInfo.getTitle());
        assertThat(result.getContent()).isEqualTo(testLaborInfo.getContent());
        assertThat(result.getImagePath()).isEqualTo(testLaborInfo.getImagePath());

        verify(laborInfoRepository, times(1)).save(any(LaborInfo.class));
        verify(fileUploadService, never()).uploadImage(any(MultipartFile.class));
    }

    @Test
    @DisplayName("노무 정보 생성 테스트 - 이미지 포함")
    void createLaborInfoWithImage() throws IOException {
        // given
        testRequestDto.setImage(mockMultipartFile);
        given(fileUploadService.uploadImage(any(MultipartFile.class))).willReturn("uploads/test-image.jpg");
        given(laborInfoRepository.save(any(LaborInfo.class))).willReturn(testLaborInfo);

        // when
        LaborInfoResponseDto result = laborInfoService.createLaborInfo(testRequestDto);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testLaborInfo.getId());
        assertThat(result.getTitle()).isEqualTo(testLaborInfo.getTitle());
        assertThat(result.getContent()).isEqualTo(testLaborInfo.getContent());
        assertThat(result.getImagePath()).isEqualTo(testLaborInfo.getImagePath());

        verify(laborInfoRepository, times(1)).save(any(LaborInfo.class));
        verify(fileUploadService, times(1)).uploadImage(any(MultipartFile.class));
    }

    @Test
    @DisplayName("노무 정보 조회 테스트 - 존재하는 ID")
    void getLaborInfoExistingId() {
        // given
        given(laborInfoRepository.findById(anyLong())).willReturn(Optional.of(testLaborInfo));

        // when
        LaborInfoResponseDto result = laborInfoService.getLaborInfo(1L);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testLaborInfo.getId());
        assertThat(result.getTitle()).isEqualTo(testLaborInfo.getTitle());
        assertThat(result.getContent()).isEqualTo(testLaborInfo.getContent());

        verify(laborInfoRepository, times(1)).findById(anyLong());
    }

    @Test
    @DisplayName("노무 정보 조회 테스트 - 존재하지 않는 ID")
    void getLaborInfoNonExistingId() {
        // given
        given(laborInfoRepository.findById(anyLong())).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> laborInfoService.getLaborInfo(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("해당 노무 정보가 없습니다");

        verify(laborInfoRepository, times(1)).findById(anyLong());
    }

    @Test
    @DisplayName("노무 정보 전체 조회 테스트")
    void getAllLaborInfos() {
        // given
        LaborInfo laborInfo2 = new LaborInfo();
        laborInfo2.setId(2L);
        laborInfo2.setTitle("두 번째 노무 정보");
        laborInfo2.setContent("두 번째 내용입니다.");
        laborInfo2.setCreatedAt(LocalDateTime.now());

        given(laborInfoRepository.findAll()).willReturn(Arrays.asList(testLaborInfo, laborInfo2));

        // when
        List<LaborInfoResponseDto> results = laborInfoService.getAllLaborInfos();

        // then
        assertThat(results).isNotNull();
        assertThat(results).hasSize(2);
        assertThat(results.get(0).getTitle()).isEqualTo(testLaborInfo.getTitle());
        assertThat(results.get(1).getTitle()).isEqualTo(laborInfo2.getTitle());

        verify(laborInfoRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("최근 노무 정보 조회 테스트")
    void getRecentLaborInfos() {
        // given
        LaborInfo laborInfo2 = new LaborInfo();
        laborInfo2.setId(2L);
        laborInfo2.setTitle("두 번째 노무 정보");
        laborInfo2.setContent("두 번째 내용입니다.");
        laborInfo2.setCreatedAt(LocalDateTime.now());

        given(laborInfoRepository.findTop5ByOrderByIdDesc()).willReturn(Arrays.asList(laborInfo2, testLaborInfo));

        // when
        List<LaborInfoResponseDto> results = laborInfoService.getRecentLaborInfos();

        // then
        assertThat(results).isNotNull();
        assertThat(results).hasSize(2);
        assertThat(results.get(0).getTitle()).isEqualTo(laborInfo2.getTitle());
        assertThat(results.get(1).getTitle()).isEqualTo(testLaborInfo.getTitle());

        verify(laborInfoRepository, times(1)).findTop5ByOrderByIdDesc();
    }

    @Test
    @DisplayName("노무 정보 수정 테스트 - 이미지 없음")
    void updateLaborInfoWithoutImage() throws IOException {
        // given
        testRequestDto.setImage(null);
        given(laborInfoRepository.findById(anyLong())).willReturn(Optional.of(testLaborInfo));
        given(laborInfoRepository.save(any(LaborInfo.class))).willReturn(testLaborInfo);

        // when
        LaborInfoResponseDto result = laborInfoService.updateLaborInfo(1L, testRequestDto);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testLaborInfo.getId());
        assertThat(result.getTitle()).isEqualTo(testLaborInfo.getTitle());
        assertThat(result.getContent()).isEqualTo(testLaborInfo.getContent());

        verify(laborInfoRepository, times(1)).findById(anyLong());
        verify(laborInfoRepository, times(1)).save(any(LaborInfo.class));
        verify(fileUploadService, never()).uploadImage(any(MultipartFile.class));
        verify(fileUploadService, never()).deleteFile(anyString());
    }

    @Test
    @DisplayName("노무 정보 수정 테스트 - 이미지 포함")
    void updateLaborInfoWithImage() throws IOException {
        // given
        testRequestDto.setImage(mockMultipartFile);
        given(laborInfoRepository.findById(anyLong())).willReturn(Optional.of(testLaborInfo));
        given(fileUploadService.uploadImage(any(MultipartFile.class))).willReturn("uploads/new-test-image.jpg");
        given(laborInfoRepository.save(any(LaborInfo.class))).willReturn(testLaborInfo);

        // when
        LaborInfoResponseDto result = laborInfoService.updateLaborInfo(1L, testRequestDto);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testLaborInfo.getId());
        assertThat(result.getTitle()).isEqualTo(testLaborInfo.getTitle());
        assertThat(result.getContent()).isEqualTo(testLaborInfo.getContent());

        verify(laborInfoRepository, times(1)).findById(anyLong());
        verify(laborInfoRepository, times(1)).save(any(LaborInfo.class));
        verify(fileUploadService, times(1)).uploadImage(any(MultipartFile.class));
        verify(fileUploadService, times(1)).deleteFile(anyString());
    }

    @Test
    @DisplayName("노무 정보 삭제 테스트 - 이미지 있음")
    void deleteLaborInfoWithImage() {
        // given
        given(laborInfoRepository.findById(anyLong())).willReturn(Optional.of(testLaborInfo));
        given(fileUploadService.deleteFile(anyString())).willReturn(true);

        // when
        laborInfoService.deleteLaborInfo(1L);

        // then
        verify(laborInfoRepository, times(1)).findById(anyLong());
        verify(laborInfoRepository, times(1)).delete(any(LaborInfo.class));
        verify(fileUploadService, times(1)).deleteFile(anyString());
    }

    @Test
    @DisplayName("노무 정보 삭제 테스트 - 이미지 없음")
    void deleteLaborInfoWithoutImage() {
        // given
        testLaborInfo.setImagePath(null);
        given(laborInfoRepository.findById(anyLong())).willReturn(Optional.of(testLaborInfo));

        // when
        laborInfoService.deleteLaborInfo(1L);

        // then
        verify(laborInfoRepository, times(1)).findById(anyLong());
        verify(laborInfoRepository, times(1)).delete(any(LaborInfo.class));
        verify(fileUploadService, never()).deleteFile(anyString());
    }
}
