package com.rich.sodam.service;

import com.rich.sodam.domain.TaxInfo;
import com.rich.sodam.dto.request.TaxInfoRequestDto;
import com.rich.sodam.dto.response.TaxInfoResponseDto;
import com.rich.sodam.repository.TaxInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 세무 정보 서비스
 * 세무 정보에 대한 CRUD 기능을 제공하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
public class TaxInfoService {

    private final TaxInfoRepository taxInfoRepository;
    private final FileUploadService fileUploadService;

    /**
     * 세무 정보 생성
     *
     * @param requestDto 세무 정보 생성 요청 DTO
     * @return 생성된 세무 정보 응답 DTO
     * @throws IOException 파일 업로드 중 오류 발생 시
     */
    @Transactional
    public TaxInfoResponseDto createTaxInfo(TaxInfoRequestDto requestDto) throws IOException {
        TaxInfo taxInfo = new TaxInfo();
        taxInfo.setTitle(requestDto.getTitle());
        taxInfo.setContent(requestDto.getContent());

        // 이미지 업로드
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            taxInfo.setImagePath(imagePath);
        }

        TaxInfo savedTaxInfo = taxInfoRepository.save(taxInfo);
        return TaxInfoResponseDto.from(savedTaxInfo);
    }

    /**
     * 세무 정보 조회
     *
     * @param id 세무 정보 ID
     * @return 세무 정보 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 세무 정보가 없을 경우
     */
    @Transactional(readOnly = true)
    public TaxInfoResponseDto getTaxInfo(Long id) {
        TaxInfo taxInfo = taxInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 세무 정보가 없습니다. id=" + id));
        return TaxInfoResponseDto.from(taxInfo);
    }

    /**
     * 세무 정보 전체 조회
     *
     * @return 세무 정보 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<TaxInfoResponseDto> getAllTaxInfos() {
        return taxInfoRepository.findAll().stream()
                .map(TaxInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 최근 세무 정보 5개 조회
     *
     * @return 최근 세무 정보 응답 DTO 목록 (최대 5개)
     */
    @Transactional(readOnly = true)
    public List<TaxInfoResponseDto> getRecentTaxInfos() {
        return taxInfoRepository.findTop5ByOrderByIdDesc().stream()
                .map(TaxInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 세무 정보 수정
     *
     * @param id         세무 정보 ID
     * @param requestDto 세무 정보 수정 요청 DTO
     * @return 수정된 세무 정보 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 세무 정보가 없을 경우
     * @throws IOException              파일 업로드 중 오류 발생 시
     */
    @Transactional
    public TaxInfoResponseDto updateTaxInfo(Long id, TaxInfoRequestDto requestDto) throws IOException {
        TaxInfo taxInfo = taxInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 세무 정보가 없습니다. id=" + id));

        taxInfo.setTitle(requestDto.getTitle());
        taxInfo.setContent(requestDto.getContent());

        // 이미지 업로드 (기존 이미지가 있으면 삭제)
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            if (taxInfo.getImagePath() != null) {
                fileUploadService.deleteFile(taxInfo.getImagePath());
            }
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            taxInfo.setImagePath(imagePath);
        }

        TaxInfo updatedTaxInfo = taxInfoRepository.save(taxInfo);
        return TaxInfoResponseDto.from(updatedTaxInfo);
    }

    /**
     * 세무 정보 삭제
     *
     * @param id 세무 정보 ID
     * @throws IllegalArgumentException 해당 ID의 세무 정보가 없을 경우
     */
    @Transactional
    public void deleteTaxInfo(Long id) {
        TaxInfo taxInfo = taxInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 세무 정보가 없습니다. id=" + id));

        // 이미지 파일 삭제
        if (taxInfo.getImagePath() != null) {
            fileUploadService.deleteFile(taxInfo.getImagePath());
        }

        taxInfoRepository.delete(taxInfo);
    }
}
