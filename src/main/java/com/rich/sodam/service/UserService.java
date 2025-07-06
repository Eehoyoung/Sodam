package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder bCryptPasswordEncoder) {
        this.userRepository = userRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
    }

    @Transactional
    public Optional<User> loadUserByLoginId(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent() && bCryptPasswordEncoder.matches(password, user.get().getPassword())) {
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
        String password = bCryptPasswordEncoder.encode(joinDto.getPassword());
        user.setPassword(password);
        user.setEmail(joinDto.getEmail());
        user.setName(joinDto.getName());
        user.setUserGrade(UserGrade.NORMAL);
        user.setCreatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }
}
