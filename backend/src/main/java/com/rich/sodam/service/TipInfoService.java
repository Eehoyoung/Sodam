package com.rich.sodam.service;

import com.rich.sodam.domain.TipInfo;
import com.rich.sodam.dto.request.TipInfoRequestDto;
import com.rich.sodam.dto.response.TipInfoResponseDto;
import com.rich.sodam.repository.TipInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 소상공인 꿀팁 서비스
 * 소상공인 꿀팁에 대한 CRUD 기능을 제공하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
public class TipInfoService {

    private final TipInfoRepository tipInfoRepository;
    private final FileUploadService fileUploadService;

    /**
     * 소상공인 꿀팁 생성
     *
     * @param requestDto 소상공인 꿀팁 생성 요청 DTO
     * @return 생성된 소상공인 꿀팁 응답 DTO
     * @throws IOException 파일 업로드 중 오류 발생 시
     */
    @Transactional
    public TipInfoResponseDto createTipInfo(TipInfoRequestDto requestDto) throws IOException {
        TipInfo tipInfo = new TipInfo();
        tipInfo.setTitle(requestDto.getTitle());
        tipInfo.setContent(requestDto.getContent());

        // 이미지 업로드
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            tipInfo.setImagePath(imagePath);
        }

        TipInfo savedTipInfo = tipInfoRepository.save(tipInfo);
        return TipInfoResponseDto.from(savedTipInfo);
    }

    /**
     * 소상공인 꿀팁 조회
     *
     * @param id 소상공인 꿀팁 ID
     * @return 소상공인 꿀팁 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 소상공인 꿀팁이 없을 경우
     */
    @Transactional(readOnly = true)
    public TipInfoResponseDto getTipInfo(Long id) {
        TipInfo tipInfo = tipInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 소상공인 꿀팁이 없습니다. id=" + id));
        return TipInfoResponseDto.from(tipInfo);
    }

    /**
     * 소상공인 꿀팁 전체 조회
     *
     * @return 소상공인 꿀팁 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<TipInfoResponseDto> getAllTipInfos() {
        return tipInfoRepository.findAll().stream()
                .map(TipInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 최근 소상공인 꿀팁 5개 조회
     *
     * @return 최근 소상공인 꿀팁 응답 DTO 목록 (최대 5개)
     */
    @Transactional(readOnly = true)
    public List<TipInfoResponseDto> getRecentTipInfos() {
        return tipInfoRepository.findTop5ByOrderByIdDesc().stream()
                .map(TipInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 제목으로 소상공인 꿀팁 검색
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @Transactional(readOnly = true)
    public List<TipInfoResponseDto> searchTipInfosByTitle(String keyword) {
        return tipInfoRepository.findByTitleContaining(keyword).stream()
                .map(TipInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 내용으로 소상공인 꿀팁 검색
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @Transactional(readOnly = true)
    public List<TipInfoResponseDto> searchTipInfosByContent(String keyword) {
        return tipInfoRepository.findByContentContaining(keyword).stream()
                .map(TipInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 소상공인 꿀팁 수정
     *
     * @param id         소상공인 꿀팁 ID
     * @param requestDto 소상공인 꿀팁 수정 요청 DTO
     * @return 수정된 소상공인 꿀팁 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 소상공인 꿀팁이 없을 경우
     * @throws IOException              파일 업로드 중 오류 발생 시
     */
    @Transactional
    public TipInfoResponseDto updateTipInfo(Long id, TipInfoRequestDto requestDto) throws IOException {
        TipInfo tipInfo = tipInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 소상공인 꿀팁이 없습니다. id=" + id));

        tipInfo.setTitle(requestDto.getTitle());
        tipInfo.setContent(requestDto.getContent());

        // 이미지 업로드 (기존 이미지가 있으면 삭제)
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            if (tipInfo.getImagePath() != null) {
                fileUploadService.deleteFile(tipInfo.getImagePath());
            }
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            tipInfo.setImagePath(imagePath);
        }

        TipInfo updatedTipInfo = tipInfoRepository.save(tipInfo);
        return TipInfoResponseDto.from(updatedTipInfo);
    }

    /**
     * 소상공인 꿀팁 삭제
     *
     * @param id 소상공인 꿀팁 ID
     * @throws IllegalArgumentException 해당 ID의 소상공인 꿀팁이 없을 경우
     */
    @Transactional
    public void deleteTipInfo(Long id) {
        TipInfo tipInfo = tipInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 소상공인 꿀팁이 없습니다. id=" + id));

        // 이미지 파일 삭제
        if (tipInfo.getImagePath() != null) {
            fileUploadService.deleteFile(tipInfo.getImagePath());
        }

        tipInfoRepository.delete(tipInfo);
    }
}
