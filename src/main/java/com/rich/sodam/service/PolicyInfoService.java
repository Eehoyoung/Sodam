package com.rich.sodam.service;

import com.rich.sodam.domain.PolicyInfo;
import com.rich.sodam.dto.request.PolicyInfoRequestDto;
import com.rich.sodam.dto.response.PolicyInfoResponseDto;
import com.rich.sodam.repository.PolicyInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 국가정책 정보 서비스
 * 국가정책 정보에 대한 CRUD 기능을 제공하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
public class PolicyInfoService {

    private final PolicyInfoRepository policyInfoRepository;
    private final FileUploadService fileUploadService;

    /**
     * 국가정책 정보 생성
     *
     * @param requestDto 국가정책 정보 생성 요청 DTO
     * @return 생성된 국가정책 정보 응답 DTO
     * @throws IOException 파일 업로드 중 오류 발생 시
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "policyInfo", key = "'all'"),
            @CacheEvict(value = "policyInfo", key = "'recent'")
    })
    public PolicyInfoResponseDto createPolicyInfo(PolicyInfoRequestDto requestDto) throws IOException {
        PolicyInfo policyInfo = new PolicyInfo();
        policyInfo.setTitle(requestDto.getTitle());
        policyInfo.setContent(requestDto.getContent());

        // 이미지 업로드
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            policyInfo.setImagePath(imagePath);
        }

        PolicyInfo savedPolicyInfo = policyInfoRepository.save(policyInfo);
        return PolicyInfoResponseDto.from(savedPolicyInfo);
    }

    /**
     * 국가정책 정보 조회
     *
     * @param id 국가정책 정보 ID
     * @return 국가정책 정보 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 국가정책 정보가 없을 경우
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "policyInfo", key = "#id")
    public PolicyInfoResponseDto getPolicyInfo(Long id) {
        PolicyInfo policyInfo = policyInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 국가정책 정보가 없습니다. id=" + id));
        return PolicyInfoResponseDto.from(policyInfo);
    }

    /**
     * 국가정책 정보 전체 조회 (페이지네이션 없음)
     * 주의: 데이터가 많을 경우 성능 이슈가 발생할 수 있으므로 getPolicyInfosWithPagination 메소드 사용을 권장
     *
     * @return 국가정책 정보 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "policyInfo", key = "'all'")
    public List<PolicyInfoResponseDto> getAllPolicyInfos() {
        return policyInfoRepository.findAll().stream()
                .map(PolicyInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 국가정책 정보 페이지네이션 조회
     * 서버 리소스 최적화를 위해 페이지네이션을 적용한 조회 메소드
     *
     * @param pageable 페이지 정보 (페이지 번호, 페이지 크기, 정렬 정보 등)
     * @return 페이지네이션이 적용된 국가정책 정보 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "policyInfo", key = "'page:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<PolicyInfoResponseDto> getPolicyInfosWithPagination(Pageable pageable) {
        return policyInfoRepository.findAll(pageable)
                .map(PolicyInfoResponseDto::from);
    }

    /**
     * 최근 국가정책 정보 5개 조회
     *
     * @return 최근 국가정책 정보 응답 DTO 목록 (최대 5개)
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "policyInfo", key = "'recent'")
    public List<PolicyInfoResponseDto> getRecentPolicyInfos() {
        return policyInfoRepository.findTop5ByOrderByIdDesc().stream()
                .map(PolicyInfoResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 국가정책 정보 수정
     *
     * @param id         국가정책 정보 ID
     * @param requestDto 국가정책 정보 수정 요청 DTO
     * @return 수정된 국가정책 정보 응답 DTO
     * @throws IllegalArgumentException 해당 ID의 국가정책 정보가 없을 경우
     * @throws IOException              파일 업로드 중 오류 발생 시
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "policyInfo", key = "#id"),
            @CacheEvict(value = "policyInfo", key = "'all'"),
            @CacheEvict(value = "policyInfo", key = "'recent'")
    })
    public PolicyInfoResponseDto updatePolicyInfo(Long id, PolicyInfoRequestDto requestDto) throws IOException {
        PolicyInfo policyInfo = policyInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 국가정책 정보가 없습니다. id=" + id));

        policyInfo.setTitle(requestDto.getTitle());
        policyInfo.setContent(requestDto.getContent());

        // 이미지 업로드 (기존 이미지가 있으면 삭제)
        if (requestDto.getImage() != null && !requestDto.getImage().isEmpty()) {
            if (policyInfo.getImagePath() != null) {
                fileUploadService.deleteFile(policyInfo.getImagePath());
            }
            String imagePath = fileUploadService.uploadImage(requestDto.getImage());
            policyInfo.setImagePath(imagePath);
        }

        PolicyInfo updatedPolicyInfo = policyInfoRepository.save(policyInfo);
        return PolicyInfoResponseDto.from(updatedPolicyInfo);
    }

    /**
     * 국가정책 정보 삭제
     *
     * @param id 국가정책 정보 ID
     * @throws IllegalArgumentException 해당 ID의 국가정책 정보가 없을 경우
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "policyInfo", key = "#id"),
            @CacheEvict(value = "policyInfo", key = "'all'"),
            @CacheEvict(value = "policyInfo", key = "'recent'")
    })
    public void deletePolicyInfo(Long id) {
        PolicyInfo policyInfo = policyInfoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 국가정책 정보가 없습니다. id=" + id));

        // 이미지 파일 삭제
        if (policyInfo.getImagePath() != null) {
            fileUploadService.deleteFile(policyInfo.getImagePath());
        }

        policyInfoRepository.delete(policyInfo);
    }
}
