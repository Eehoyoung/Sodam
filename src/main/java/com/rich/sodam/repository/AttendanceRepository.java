package com.rich.sodam.repository;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByEmployeeProfileAndCheckInTimeBetween(
            EmployeeProfile employeeProfile, LocalDateTime startDate, LocalDateTime endDate);

    List<Attendance> findByStoreAndCheckInTimeBetween(
            Store store, LocalDateTime startDate, LocalDateTime endDate);

    List<Attendance> findByEmployeeProfileAndStoreAndCheckInTimeBetween(
            EmployeeProfile employeeProfile, Store store, LocalDateTime startDate, LocalDateTime endDate);
}