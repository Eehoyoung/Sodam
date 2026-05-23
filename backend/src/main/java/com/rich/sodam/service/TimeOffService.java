package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class TimeOffService {

    private final TimeOffRepository timeOffRepository;
    private final StoreRepository storeRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final UserRepository userRepository;

    @Autowired
    public TimeOffService(TimeOffRepository timeOffRepository,
                          StoreRepository storeRepository,
                          EmployeeProfileRepository employeeProfileRepository,
                          UserRepository userRepository) {
        this.timeOffRepository = timeOffRepository;
        this.storeRepository = storeRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.userRepository = userRepository;
    }

    /**
     * 휴가 신청 생성.
     * EmployeeProfile 이 없으면 자동 생성 (셀프 신청 호환).
     */
    @Transactional
    public TimeOff createTimeOffRequest(Long employeeId, Long storeId, LocalDate startDate,
                                        LocalDate endDate, String reason) {
        if (employeeId == null || storeId == null) {
            throw new IllegalArgumentException("employeeId, storeId 는 필수입니다.");
        }
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseGet(() -> {
                    // 셀프 신청 호환 — User 가 있으면 EmployeeProfile 자동 생성.
                    User user = userRepository.findById(employeeId)
                            .orElseThrow(() -> new NoSuchElementException("직원을 찾을 수 없습니다."));
                    EmployeeProfile newProfile = new EmployeeProfile(user);
                    return employeeProfileRepository.save(newProfile);
                });

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));

        // 휴가 신청 생성
        TimeOff timeOff = new TimeOff(employee, store, startDate, endDate, reason);

        return timeOffRepository.save(timeOff);
    }

    /**
     * 휴가 신청 승인
     */
    @Transactional
    public TimeOff approveTimeOffRequest(Long timeOffId) {
        TimeOff timeOff = timeOffRepository.findById(timeOffId)
                .orElseThrow(() -> new NoSuchElementException("휴가 신청을 찾을 수 없습니다."));

        timeOff.approve();
        return timeOffRepository.save(timeOff);
    }

    /**
     * 휴가 신청 거부
     */
    @Transactional
    public TimeOff rejectTimeOffRequest(Long timeOffId) {
        TimeOff timeOff = timeOffRepository.findById(timeOffId)
                .orElseThrow(() -> new NoSuchElementException("휴가 신청을 찾을 수 없습니다."));

        timeOff.reject();
        return timeOffRepository.save(timeOff);
    }

    /**
     * 특정 매장의 모든 휴가 신청 조회
     */
    public List<TimeOff> getTimeOffsByStore(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));

        return timeOffRepository.findByStore(store);
    }

    /**
     * 특정 매장의 특정 상태의 휴가 신청 조회
     */
    public List<TimeOff> getTimeOffsByStoreAndStatus(Long storeId, TimeOffStatus status) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));

        return timeOffRepository.findByStoreAndStatus(store, status);
    }

    /**
     * 특정 직원의 모든 휴가 신청 조회
     */
    public List<TimeOff> getTimeOffsByEmployee(Long employeeId) {
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("직원을 찾을 수 없습니다."));

        return timeOffRepository.findByEmployee(employee);
    }

    /**
     * 특정 사장이 소유한 모든 매장의 대기 중인 휴가 신청 조회
     */
    public List<TimeOff> getPendingTimeOffsByMaster(Long masterId) {
        return timeOffRepository.findPendingTimeOffsByMasterId(masterId);
    }

    /**
     * 특정 사장이 소유한 모든 매장의 대기 중인 휴가 신청 수 조회
     */
    public int countPendingTimeOffsByMaster(Long masterId) {
        return timeOffRepository.countTimeOffsByMasterIdAndStatus(masterId, TimeOffStatus.PENDING);
    }
}
