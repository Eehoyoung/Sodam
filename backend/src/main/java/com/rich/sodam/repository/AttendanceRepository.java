package com.rich.sodam.repository;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 출퇴근 기록 레포지토리
 * 출퇴근 기록에 대한 데이터 접근 메소드를 제공합니다.
 */
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    /**
     * 특정 직원의 특정 기간 출퇴근 기록 조회
     * 최신 기록 순으로 정렬
     */
    // employeeProfile.user 까지 fetch — DTO 매핑(employeeName) 시 LazyInitializationException 방지
    @EntityGraph(attributePaths = {"employeeProfile", "employeeProfile.user", "store"})
    List<Attendance> findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
            EmployeeProfile employeeProfile, LocalDateTime startDate, LocalDateTime endDate);

    @EntityGraph(attributePaths = {"employeeProfile", "employeeProfile.user", "store"})
    List<Attendance> findByEmployeeProfileAndStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
            EmployeeProfile employeeProfile, Store store, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 매장의 특정 기간 출퇴근 기록 조회
     * 최신 기록 순으로 정렬
     */
    // employeeProfile.user 까지 fetch — 매장 전체 조회 시 LazyInitializationException 방지
    @EntityGraph(attributePaths = {"employeeProfile", "employeeProfile.user", "store"})
    List<Attendance> findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
            Store store, LocalDateTime startDate, LocalDateTime endDate);

    /** 온보딩(첫 출근) 판정 — 해당 직원이 해당 매장에 출근 기록이 있는지. */
    boolean existsByEmployeeProfile_IdAndStore_Id(Long employeeId, Long storeId);

    /** 지각·미출근 감지 배치용 — 해당 직원의 해당 매장 기간 내 출근(check-in) 기록 존재 여부. */
    boolean existsByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetween(
            Long employeeId, Long storeId, LocalDateTime start, LocalDateTime end);

    /**
     * 특정 직원의 아직 퇴근 처리되지 않은 출근 기록 조회
     */
    @Query("SELECT a FROM Attendance a WHERE a.employeeProfile = :employeeProfile AND a.checkOutTime IS NULL")
    List<Attendance> findIncompleteAttendances(@Param("employeeProfile") EmployeeProfile employeeProfile);

    /**
     * 특정 직원의 특정 매장에서 아직 퇴근 처리되지 않은 출근 기록 조회(DB_OPTIMIZATION_PLAN.md Phase 2.5).
     * {@code checkOut}이 "직원의 가장 최근 기록"이 아니라 "그 매장에서 진행 중인 기록"을 정확히
     * 특정하기 위해 사용 — 여러 매장에서 근무한 날, 엉뚱한 매장의 진행중 기록이 잘못 종료되는 것을 방지.
     */
    List<Attendance> findByEmployeeProfileAndStoreAndCheckOutTimeIsNullOrderByCheckInTimeDesc(
            EmployeeProfile employeeProfile, Store store);

    /**
     * 특정 매장의 특정 날짜의 모든 출퇴근 기록 조회
     * 인덱스 활용을 위해 날짜 범위로 조회
     */
    @Query("SELECT a FROM Attendance a WHERE a.store = :store AND a.checkInTime >= :startOfDay AND a.checkInTime < :endOfDay")
    List<Attendance> findByStoreAndDate(@Param("store") Store store,
                                        @Param("startOfDay") LocalDateTime startOfDay,
                                        @Param("endOfDay") LocalDateTime endOfDay);

    /**
     * 직원 ID와 매장 ID로 특정 기간의 출퇴근 기록 조회 (Fetch Join 사용)
     * 최신 기록 순으로 정렬하며, N+1 쿼리 문제를 방지합니다.
     */
    @Query("SELECT a FROM Attendance a " +
            "JOIN FETCH a.employeeProfile " +
            "JOIN FETCH a.store " +
            "WHERE a.employeeProfile.id = :employeeId " +
            "AND (:storeId IS NULL OR a.store.id = :storeId) " +
            "AND a.checkInTime BETWEEN :startDate AND :endDate " +
            "ORDER BY a.checkInTime DESC")
    List<Attendance> findByEmployeeIdAndStoreIdAndPeriodWithDetails(
            @Param("employeeId") Long employeeId,
            @Param("storeId") Long storeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * 직원 ID로 특정 기간의 출퇴근 기록 조회 (Fetch Join 사용)
     * 최신 기록 순으로 정렬하며, N+1 쿼리 문제를 방지합니다.
     */
    @Query("SELECT a FROM Attendance a " +
            "JOIN FETCH a.employeeProfile " +
            "JOIN FETCH a.store " +
            "WHERE a.employeeProfile.id = :employeeId " +
            "AND a.checkInTime BETWEEN :startDate AND :endDate " +
            "ORDER BY a.checkInTime DESC")
    List<Attendance> findByEmployeeIdAndPeriodWithDetails(
            @Param("employeeId") Long employeeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * 주휴수당이 포함된 출근 기록 조회
     */
    @Query("SELECT a FROM Attendance a WHERE a.employeeProfile.id = :employeeId " +
            "AND a.store.id = :storeId " +
            "AND a.checkInTime BETWEEN :startDate AND :endDate " +
            "AND a.weeklyAllowance IS NOT NULL")
    List<Attendance> findWithWeeklyAllowanceByEmployeeAndStore(
            @Param("employeeId") Long employeeId,
            @Param("storeId") Long storeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

}
