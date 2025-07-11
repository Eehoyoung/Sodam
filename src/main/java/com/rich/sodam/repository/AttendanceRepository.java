package com.rich.sodam.repository;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
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
    List<Attendance> findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
            EmployeeProfile employeeProfile, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 매장의 특정 기간 출퇴근 기록 조회
     * 최신 기록 순으로 정렬
     */
    List<Attendance> findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
            Store store, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 직원의 아직 퇴근 처리되지 않은 출근 기록 조회
     */
    @Query("SELECT a FROM Attendance a WHERE a.employeeProfile = :employeeProfile AND a.checkOutTime IS NULL")
    List<Attendance> findIncompleteAttendances(@Param("employeeProfile") EmployeeProfile employeeProfile);

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
