package com.rich.sodam.repository;

import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {

    /**
     * 사업자등록번호로 매장을 조회합니다.
     *
     * @param businessNumber 사업자등록번호
     * @return 매장 정보 (Optional)
     */
    Optional<Store> findByBusinessNumber(String businessNumber);

    // ==================== Soft Delete 관련 메서드 ====================

    /**
     * 활성 상태인 모든 매장을 조회합니다.
     *
     * @return 활성 매장 목록
     */
    @Query("SELECT s FROM Store s WHERE s.isDeleted = false OR s.isDeleted IS NULL")
    List<Store> findAllActive();

    /**
     * ID로 활성 상태인 매장을 조회합니다.
     *
     * @param id 매장 ID
     * @return 활성 매장 정보 (Optional)
     */
    @Query("SELECT s FROM Store s WHERE s.id = :id AND (s.isDeleted = false OR s.isDeleted IS NULL)")
    Optional<Store> findActiveById(@Param("id") Long id);

    /**
     * 사업자등록번호로 활성 상태인 매장을 조회합니다.
     *
     * @param businessNumber 사업자등록번호
     * @return 활성 매장 정보 (Optional)
     */
    @Query("SELECT s FROM Store s WHERE s.businessNumber = :businessNumber AND (s.isDeleted = false OR s.isDeleted IS NULL)")
    Optional<Store> findActiveByBusinessNumber(@Param("businessNumber") String businessNumber);

    /**
     * 삭제된 모든 매장을 조회합니다.
     *
     * @return 삭제된 매장 목록
     */
    @Query("SELECT s FROM Store s WHERE s.isDeleted = true")
    List<Store> findAllDeleted();

    /**
     * ID로 삭제된 매장을 조회합니다.
     *
     * @param id 매장 ID
     * @return 삭제된 매장 정보 (Optional)
     */
    @Query("SELECT s FROM Store s WHERE s.id = :id AND s.isDeleted = true")
    Optional<Store> findDeletedById(@Param("id") Long id);

    /**
     * 특정 사용자(사장)의 활성 매장 목록을 조회합니다.
     *
     * @param userId 사용자 ID
     * @return 활성 매장 목록
     */
    @Query("SELECT s FROM Store s " +
            "JOIN MasterStoreRelation msr ON s.id = msr.store.id " +
            "WHERE msr.masterProfile.user.id = :userId " +
            "AND (s.isDeleted = false OR s.isDeleted IS NULL)")
    List<Store> findActiveStoresByMaster(@Param("userId") Long userId);

    /**
     * 특정 사용자(직원)의 활성 매장 목록을 조회합니다.
     *
     * @param userId 사용자 ID
     * @return 활성 매장 목록
     */
    @Query("SELECT s FROM Store s " +
            "JOIN EmployeeStoreRelation esr ON s.id = esr.store.id " +
            "WHERE esr.employeeProfile.user.id = :userId " +
            "AND (s.isDeleted = false OR s.isDeleted IS NULL) " +
            "AND esr.isActive = true")
    List<Store> findActiveStoresByEmployee(@Param("userId") Long userId);

    // ==================== 매장 소유권 및 권한 확인 ====================

    /**
     * 특정 사용자가 특정 매장의 소유자인지 확인합니다.
     *
     * @param storeId 매장 ID
     * @param userId  사용자 ID
     * @return 소유자 여부
     */
    @Query("SELECT COUNT(msr) > 0 FROM MasterStoreRelation msr " +
            "WHERE msr.store.id = :storeId " +
            "AND msr.masterProfile.user.id = :userId " +
            "AND (msr.store.isDeleted = false OR msr.store.isDeleted IS NULL)")
    boolean existsByIdAndMasterUserId(@Param("storeId") Long storeId, @Param("userId") Long userId);

    /**
     * 특정 사용자가 특정 매장의 직원인지 확인합니다.
     *
     * @param storeId 매장 ID
     * @param userId  사용자 ID
     * @return 직원 여부
     */
    @Query("SELECT COUNT(esr) > 0 FROM EmployeeStoreRelation esr " +
            "WHERE esr.store.id = :storeId " +
            "AND esr.employeeProfile.user.id = :userId " +
            "AND (esr.store.isDeleted = false OR esr.store.isDeleted IS NULL) " +
            "AND esr.isActive = true")
    boolean existsByIdAndEmployeeUserId(@Param("storeId") Long storeId, @Param("userId") Long userId);

    // ==================== 매장 통계 및 관련 데이터 조회 ====================

    /**
     * 특정 매장의 활성 직원 수를 조회합니다.
     *
     * @param storeId 매장 ID
     * @return 활성 직원 수
     */
    @Query("SELECT COUNT(esr) FROM EmployeeStoreRelation esr " +
            "WHERE esr.store.id = :storeId " +
            "AND esr.isActive = true")
    int countActiveEmployeesByStoreId(@Param("storeId") Long storeId);

    /**
     * 특정 매장의 출근 기록 수를 조회합니다.
     *
     * @param storeId 매장 ID
     * @return 출근 기록 수
     */
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.store.id = :storeId")
    int countAttendanceRecordsByStoreId(@Param("storeId") Long storeId);

    /**
     * 특정 매장의 급여 기록 수를 조회합니다.
     *
     * @param storeId 매장 ID
     * @return 급여 기록 수
     */
    @Query("SELECT COUNT(p) FROM Payroll p WHERE p.store.id = :storeId")
    int countPayrollRecordsByStoreId(@Param("storeId") Long storeId);

    /**
     * 특정 매장의 미지급 급여 건수를 조회합니다.
     *
     * @param storeId 매장 ID
     * @return 미지급 급여 건수
     */
    @Query("SELECT COUNT(p) FROM Payroll p " +
            "WHERE p.store.id = :storeId " +
            "AND p.status <> com.rich.sodam.domain.type.PayrollStatus.PAID")
    int countUnpaidPayrollsByStoreId(@Param("storeId") Long storeId);

    /**
     * 특정 매장의 마지막 활동 일시를 조회합니다.
     *
     * @param storeId 매장 ID
     * @return 마지막 활동 일시
     */
    @Query("SELECT MAX(a.checkInTime) FROM Attendance a WHERE a.store.id = :storeId")
    Optional<LocalDateTime> findLastActivityDateByStoreId(@Param("storeId") Long storeId);

    // ==================== 검색 및 필터링 ====================

    /**
     * 매장명으로 활성 매장을 검색합니다.
     *
     * @param storeName 매장명 (부분 검색)
     * @return 검색된 활성 매장 목록
     */
    @Query("SELECT s FROM Store s " +
            "WHERE s.storeName LIKE %:storeName% " +
            "AND (s.isDeleted = false OR s.isDeleted IS NULL)")
    List<Store> findActiveStoresByNameContaining(@Param("storeName") String storeName);

    /**
     * 특정 기간 내에 생성된 활성 매장을 조회합니다.
     *
     * @param startDate 시작일
     * @param endDate   종료일
     * @return 해당 기간 내 생성된 활성 매장 목록
     */
    @Query("SELECT s FROM Store s " +
            "WHERE s.createdAt BETWEEN :startDate AND :endDate " +
            "AND (s.isDeleted = false OR s.isDeleted IS NULL)")
    List<Store> findActiveStoresByCreatedAtBetween(@Param("startDate") LocalDateTime startDate,
                                                   @Param("endDate") LocalDateTime endDate);

    /**
     * 특정 기간 내에 삭제된 매장을 조회합니다.
     *
     * @param startDate 시작일
     * @param endDate   종료일
     * @return 해당 기간 내 삭제된 매장 목록
     */
    @Query("SELECT s FROM Store s " +
            "WHERE s.deletedAt BETWEEN :startDate AND :endDate " +
            "AND s.isDeleted = true")
    List<Store> findDeletedStoresByDeletedAtBetween(@Param("startDate") LocalDateTime startDate,
                                                    @Param("endDate") LocalDateTime endDate);
}
