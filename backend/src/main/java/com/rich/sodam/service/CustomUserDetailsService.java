package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spring Security를 위한 사용자 상세 정보 서비스
 */
@Service
@Transactional(readOnly = true)
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
        log.debug("Credential lookup requested");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Credential lookup did not match an account");
                    return new UsernameNotFoundException("Invalid credentials");
                });

        log.debug("Credential lookup succeeded for userId={}", user.getId());
        return UserPrincipal.create(user);
    }
}
