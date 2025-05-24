package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Spring Security를 위한 사용자 상세 정보 서비스
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CustomUserDetailsService.class);

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 이메일을 통해 사용자를 로드하고 UserDetails 객체를 반환합니다.
     *
     * @param email 사용자 이메일
     * @return 사용자 상세 정보
     * @throws UsernameNotFoundException 사용자를 찾을 수 없는 경우
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.debug("이메일로 사용자 조회 시도: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("사용자를 찾을 수 없음: {}", email);
                    return new UsernameNotFoundException("유저 검색 실패: " + email);
                });

        log.debug("사용자 조회 성공: ID={}, 이메일={}", user.getId(), user.getEmail());
        return UserPrincipal.create(user);
    }
}