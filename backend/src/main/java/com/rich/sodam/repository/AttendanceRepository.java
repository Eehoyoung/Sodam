package com.rich.sodam.repository;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByEmployeeAndCheckInTimeBetween(
            EmployeeProfile employee, LocalDateTime start, LocalDateTime end);

    List<Attendance> findByStoreAndCheckInTimeBetween(
            Store store, LocalDateTime start, LocalDateTime end);
}