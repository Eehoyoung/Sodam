package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder bCryptPasswordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 사용자 목적을 기반으로 등급을 설정/갱신합니다.
     * - personal -> NORMAL (다운그레이드는 허용하지 않음)
     * - employee -> EMPLOYEE (NORMAL에서만 승격 허용)
     * - boss -> MASTER (NORMAL에서만 승격 허용)
     * 동일 등급 요청은 그대로 반환합니다.
     *
     * @param userId  대상 사용자 ID
     * @param purpose personal | employee | boss (대소문자 무시)
     * @return 갱신된 사용자
     */
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public User updatePurpose(Long userId, String purpose) {
        if (purpose == null || purpose.trim().isEmpty()) {
            throw new IllegalArgumentException("purpose 값이 비어있습니다.");
        }
        String p = purpose.trim().toLowerCase();
        UserGrade target;
        switch (p) {
            case "personal":
                target = UserGrade.NORMAL;
                break;
            case "employee":
                target = UserGrade.EMPLOYEE;
                break;
            case "boss":
                target = UserGrade.MASTER;
                break;
            default:
                throw new IllegalArgumentException("유효하지 않은 purpose 값입니다: " + purpose);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        // 동일 등급이면 변경 없이 반환
        if (user.getUserGrade() == target) {
            return user;
        }

        // NORMAL에서만 승격 허용, 다운그레이드는 금지
        if (target == UserGrade.EMPLOYEE || target == UserGrade.MASTER) {
            if (user.getUserGrade() != UserGrade.NORMAL) {
                throw new IllegalStateException("권한 승격은 NORMAL 등급에서만 가능합니다. 현재 등급: " + user.getUserGrade());
            }
            if (target == UserGrade.EMPLOYEE) {
                user.changeToEmployee();
            } else {
                user.changeToMaster();
            }
        } else { // target == NORMAL
            if (user.getUserGrade() != UserGrade.NORMAL) {
                throw new IllegalStateException("권한을 낮출 수 없습니다. 현재 등급: " + user.getUserGrade());
            }
            // 이미 NORMAL이 아니면 위에서 예외, 여기 도달 시 NORMAL 유지
        }

        return userRepository.save(user);
    }

    @Transactional
    public Optional<User> loadUserByLoginId(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent() && passwordEncoder.matches(password, user.get().getPassword())) {
            return user;
        }
        return Optional.empty();
    }


    @Cacheable(value = "users", key = "#email")
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @jakarta.transaction.Transactional
    @CacheEvict(value = "users", key = "#joinDto.email")
    public User joinUser(JoinDto joinDto) {
        User user = new User();
        String password = passwordEncoder.encode(joinDto.getPassword());
        user.setPassword(password);
        user.setEmail(joinDto.getEmail());
        user.setName(joinDto.getName());
        user.setUserGrade(UserGrade.NORMAL);
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    /**
     * 사용자를 사업주로 전환합니다.
     * AUTH-008: 사업주 전환 기능
     *
     * @param userId 전환할 사용자 ID
     * @return 전환된 사용자 정보
     * @throws IllegalArgumentException 사용자를 찾을 수 없거나 이미 사업주인 경우
     */
    @Transactional
    @CacheEvict(value = "users", allEntries = true)
    public User convertToOwner(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        // 이미 사업주(MASTER)인 경우 예외 처리
        if (user.getUserGrade() == UserGrade.MASTER) {
            throw new IllegalArgumentException("이미 사업주 권한을 가진 사용자입니다.");
        }

        // 일반 사용자만 사업주로 전환 가능
        if (user.getUserGrade() != UserGrade.NORMAL) {
            throw new IllegalArgumentException("일반 사용자만 사업주로 전환할 수 있습니다. 현재 등급: " + user.getUserGrade());
        }

        // 사업주로 전환
        user.changeToMaster();
        return userRepository.save(user);
    }

    /**
     * 사용자 ID로 사용자 조회
     *
     * @param userId 사용자 ID
     * @return 사용자 정보
     */
    @Cacheable(value = "users", key = "#userId")
    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    /**
     * 사용자가 사업주(MASTER) 권한을 가지고 있는지 확인
     *
     * @param userId 확인할 사용자 ID
     * @return 사업주 권한 여부
     * @throws IllegalArgumentException 사용자를 찾을 수 없는 경우
     */
    @Cacheable(value = "users", key = "'master:' + #userId")
    public boolean isMaster(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

        return user.getUserGrade() == UserGrade.MASTER;
    }

    /**
     * 사업주 권한 검증 (예외 발생)
     *
     * @param userId 확인할 사용자 ID
     * @throws IllegalArgumentException 사용자를 찾을 수 없거나 사업주가 아닌 경우
     */
    public void validateMasterPermission(Long userId) {
        if (!isMaster(userId)) {
            throw new IllegalArgumentException("사업주 권한이 필요합니다. 사용자 ID: " + userId);
        }
    }

    /**
     * 직원 정보 수정
     * STORE-012: 직원 기본 정보, 직책 등 수정
     *
     * @param employeeId 수정할 직원 ID
     * @param updateDto  수정할 정보
     * @return 수정된 사용자 정보
     * @throws IllegalArgumentException 직원을 찾을 수 없거나 권한이 없는 경우
     */
    @Transactional
    @CacheEvict(value = "users", key = "#employeeId")
    public User updateEmployeeInfo(Long employeeId, EmployeeUpdateDto updateDto) {
        // 1. 직원 존재 여부 확인
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("직원을 찾을 수 없습니다. ID: " + employeeId));

        // 2. 이메일 중복 검사 (변경하는 경우)
        if (updateDto.getEmail() != null && !updateDto.getEmail().equals(employee.getEmail())) {
            Optional<User> existingUser = userRepository.findByEmail(updateDto.getEmail());
            if (existingUser.isPresent()) {
                throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + updateDto.getEmail());
            }
        }

        // 3. 정보 업데이트
        if (updateDto.getName() != null && !updateDto.getName().trim().isEmpty()) {
            employee.setName(updateDto.getName().trim());
        }

        if (updateDto.getEmail() != null && !updateDto.getEmail().trim().isEmpty()) {
            employee.setEmail(updateDto.getEmail().trim());
        }

        if (updateDto.getUserGrade() != null) {
            // 직책 변경 시 적절한 메서드 사용
            if (updateDto.getUserGrade() == UserGrade.MASTER) {
                employee.changeToMaster();
            } else if (updateDto.getUserGrade() == UserGrade.EMPLOYEE) {
                employee.changeToEmployee();
            } else {
                employee.setUserGrade(updateDto.getUserGrade());
            }
        }

        // 4. 저장 및 반환
        return userRepository.save(employee);
    }
}
