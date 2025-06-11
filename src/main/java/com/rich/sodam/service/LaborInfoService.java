package com.rich.sodam.service;

import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.dto.request.LaborInfoRequestDto;
import com.rich.sodam.dto.response.LaborInfoResponseDto;
import com.rich.sodam.repository.LaborInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 노무 정보 서비스
 * 노무 정보에 대한 CRUD 기능을 제공하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
public class LaborInfoService {

    private final LaborInfoRepository laborInfoRepository;
    private final FileUploadService fileUploadService;

    /**
     * 노무 정보 생성
     *
     * @param requestDto 노무 정보 생성 요청 DTO
     * @return 생성된 노무 정보 응답 DTO
     * @throws IOException 파일 업로드 중 오류 발생 시
     */
    @Transactional
    public LaborInfoResponseDto createLaborInfo(LaborInfoRequestDto requestDto) throws IOException {
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle(requestDto.getTitle());
        laborInfo.setContent(requestDto.getContent());

        // 이미지 업로드
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            laborInfo.setImagePath(imagePath);
        }

        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);
        return LaborInfoResponseDto.from(savedLaborInfo);
    }

    /**
     * 노무 정보 조회
     *
     * @param id 노무 정보 ID
     * @return 노무 정보 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 노무 정보가 없을 경우
     */
    @Transactional(readOnly = true)
    public LaborInfoResponseDto getLaborInfo(Long id) {
        LaborInfo laborInfo = laborInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 노무 정보가 없습니다. id=" + id));
        return LaborInfoResponseDto.from(laborInfo);
    }

    /**
     * 노무 정보 전체 조회
     *
     * @return 노무 정보 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<LaborInfoResponseDto> getAllLaborInfos() {
        return laborInfoRepository.findAll().stream()
                .map(LaborInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 최근 노무 정보 5개 조회
     *
     * @return 최근 노무 정보 응답 DTO 목록 (최대 5개)
     */
    @Transactional(readOnly = true)
    public List<LaborInfoResponseDto> getRecentLaborInfos() {
        return laborInfoRepository.findTop5ByOrderByIdDesc().stream()
                .map(LaborInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 노무 정보 수정
     *
     * @param id         노무 정보 ID
     * @param requestDto 노무 정보 수정 요청 DTO
     * @return 수정된 노무 정보 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 노무 정보가 없을 경우
     * @throws IOException              파일 업로드 중 오류 발생 시
     */
    @Transactional
    public LaborInfoResponseDto updateLaborInfo(Long id, LaborInfoRequestDto requestDto) throws IOException {
        LaborInfo laborInfo = laborInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 노무 정보가 없습니다. id=" + id));

        laborInfo.setTitle(requestDto.getTitle());
        laborInfo.setContent(requestDto.getContent());

        // 이미지 업로드 (기존 이미지가 있으면 삭제)
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            if (laborInfo.getImagePath() != null) {
                fileUploadService.deleteFile(laborInfo.getImagePath());
            }
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            laborInfo.setImagePath(imagePath);
        }

        LaborInfo updatedLaborInfo = laborInfoRepository.save(laborInfo);
        return LaborInfoResponseDto.from(updatedLaborInfo);
    }

    /**
     * 노무 정보 삭제
     *
     * @param id 노무 정보 ID
     * @throws IllegalArgumentException 해당 ID의 노무 정보가 없을 경우
     */
    @Transactional
    public void deleteLaborInfo(Long id) {
        LaborInfo laborInfo = laborInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 노무 정보가 없습니다. id=" + id));

        // 이미지 파일 삭제
        if (laborInfo.getImagePath() != null) {
            fileUploadService.deleteFile(laborInfo.getImagePath());
        }

        laborInfoRepository.delete(laborInfo);
    }
}
