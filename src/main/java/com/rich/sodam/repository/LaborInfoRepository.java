package com.rich.sodam.repository;

import com.rich.sodam.domain.LaborInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LaborInfoRepository extends JpaRepository<LaborInfo, Long> {

    /**
     * ID를 기준으로 최근 순서대로 상위 5개 조회
     *
     * @return 최근 순서대로 정렬된 LaborInfo 목록 (최대 5개)
     */
    List<LaborInfo> findTop5ByOrderByIdDesc();

    /**
     * 제목에 특정 키워드가 포함된 항목 검색
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    List<LaborInfo> findByTitleContaining(String keyword);
}
