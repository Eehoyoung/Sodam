package com.rich.sodam.repository;

import com.rich.sodam.domain.LaborInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

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

    /**
     * 특정 연도의 최저임금 기준값이 등록된 노무정보(최신 1건) 조회.
     * 노무 리스크 대시보드의 차기년도 최저임금 미달 사전 경고용.
     */
    Optional<LaborInfo> findFirstByYearAndMinimumWageIsNotNullOrderByIdDesc(Integer year);
}
