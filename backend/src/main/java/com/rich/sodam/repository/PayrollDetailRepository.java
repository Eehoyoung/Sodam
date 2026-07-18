package com.rich.sodam.repository;

import com.rich.sodam.domain.PayrollDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 급여 상세 내역 레포지토리
 */
public interface PayrollDetailRepository extends JpaRepository<PayrollDetail, Long> {

    /**
     * 급여 ID로 상세 내역 조회
     * 근무일 기준 오름차순 정렬
     */
    List<PayrollDetail> findByPayroll_IdOrderByWorkDateAsc(Long payrollId);

    /**
     * 재계산(recalculate) 시 기존 급여의 상세 내역을 모두 제거한다.
     *
     * <p>벌크 삭제(JPQL DELETE)라 호출 즉시 DB에 DELETE 문이 실행된다(플러시 대기 없음) — 이어서
     * 같은 트랜잭션에서 동일 attendance_id 를 참조하는 새 상세 내역을 삽입해도
     * {@code payroll_detail.attendance_id} UNIQUE 제약(V1 baseline)과 충돌하지 않는다. 만약 파생
     * {@code deleteBy...} 메서드(엔티티 로드 후 개별 remove, flush 시점까지 지연)를 썼다면 삭제가
     * 반영되기 전에 새 INSERT 가 먼저 나가 유니크 제약 위반이 재발할 수 있어 명시적 벌크 쿼리로 작성했다.</p>
     */
    @Modifying
    @Query("DELETE FROM PayrollDetail pd WHERE pd.payroll.id = :payrollId")
    void deleteByPayrollId(@Param("payrollId") Long payrollId);
}