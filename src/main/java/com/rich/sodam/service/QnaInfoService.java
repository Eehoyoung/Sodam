package com.rich.sodam.service;

import com.rich.sodam.domain.QnaInfo;
import com.rich.sodam.dto.request.QnaInfoRequestDto;
import com.rich.sodam.dto.response.QnaInfoResponseDto;
import com.rich.sodam.repository.QnaInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 사이트 질문 서비스
 * 사이트 질문에 대한 CRUD 기능을 제공하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
public class QnaInfoService {

    private final QnaInfoRepository qnaInfoRepository;
    private final FileUploadService fileUploadService;

    /**
     * 사이트 질문 생성
     *
     * @param requestDto 사이트 질문 생성 요청 DTO
     * @return 생성된 사이트 질문 응답 DTO
     * @throws IOException 파일 업로드 중 오류 발생 시
     */
    @Transactional
    public QnaInfoResponseDto createQnaInfo(QnaInfoRequestDto requestDto) throws IOException {
        QnaInfo qnaInfo = new QnaInfo();
        qnaInfo.setTitle(requestDto.getTitle());
        qnaInfo.setQuestion(requestDto.getQuestion());
        qnaInfo.setAnswer(requestDto.getAnswer());

        // 이미지 업로드
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            qnaInfo.setImagePath(imagePath);
        }

        QnaInfo savedQnaInfo = qnaInfoRepository.save(qnaInfo);
        return QnaInfoResponseDto.from(savedQnaInfo);
    }

    /**
     * 사이트 질문 조회
     *
     * @param id 사이트 질문 ID
     * @return 사이트 질문 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 사이트 질문이 없을 경우
     */
    @Transactional(readOnly = true)
    public QnaInfoResponseDto getQnaInfo(Long id) {
        QnaInfo qnaInfo = qnaInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 사이트 질문이 없습니다. id=" + id));
        return QnaInfoResponseDto.from(qnaInfo);
    }

    /**
     * 사이트 질문 전체 조회
     *
     * @return 사이트 질문 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<QnaInfoResponseDto> getAllQnaInfos() {
        return qnaInfoRepository.findAll().stream()
                .map(QnaInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 최근 사이트 질문 5개 조회
     *
     * @return 최근 사이트 질문 응답 DTO 목록 (최대 5개)
     */
    @Transactional(readOnly = true)
    public List<QnaInfoResponseDto> getRecentQnaInfos() {
        return qnaInfoRepository.findTop5ByOrderByIdDesc().stream()
                .map(QnaInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 제목으로 사이트 질문 검색
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @Transactional(readOnly = true)
    public List<QnaInfoResponseDto> searchQnaInfosByTitle(String keyword) {
        return qnaInfoRepository.findByTitleContaining(keyword).stream()
                .map(QnaInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 질문 내용으로 사이트 질문 검색
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @Transactional(readOnly = true)
    public List<QnaInfoResponseDto> searchQnaInfosByQuestion(String keyword) {
        return qnaInfoRepository.findByQuestionContaining(keyword).stream()
                .map(QnaInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 사이트 질문 수정
     *
     * @param id         사이트 질문 ID
     * @param requestDto 사이트 질문 수정 요청 DTO
     * @return 수정된 사이트 질문 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 사이트 질문이 없을 경우
     * @throws IOException              파일 업로드 중 오류 발생 시
     */
    @Transactional
    public QnaInfoResponseDto updateQnaInfo(Long id, QnaInfoRequestDto requestDto) throws IOException {
        QnaInfo qnaInfo = qnaInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 사이트 질문이 없습니다. id=" + id));

        qnaInfo.setTitle(requestDto.getTitle());
        qnaInfo.setQuestion(requestDto.getQuestion());
        qnaInfo.setAnswer(requestDto.getAnswer());

        // 이미지 업로드 (기존 이미지가 있으면 삭제)
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            if (qnaInfo.getImagePath() != null) {
                fileUploadService.deleteFile(qnaInfo.getImagePath());
            }
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            qnaInfo.setImagePath(imagePath);
        }

        QnaInfo updatedQnaInfo = qnaInfoRepository.save(qnaInfo);
        return QnaInfoResponseDto.from(updatedQnaInfo);
    }

    /**
     * 사이트 질문 삭제
     *
     * @param id 사이트 질문 ID
     * @throws IllegalArgumentException 해당 ID의 사이트 질문이 없을 경우
     */
    @Transactional
    public void deleteQnaInfo(Long id) {
        QnaInfo qnaInfo = qnaInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 사이트 질문이 없습니다. id=" + id));

        // 이미지 파일 삭제
        if (qnaInfo.getImagePath() != null) {
            fileUploadService.deleteFile(qnaInfo.getImagePath());
        }

        qnaInfoRepository.delete(qnaInfo);
    }
}
