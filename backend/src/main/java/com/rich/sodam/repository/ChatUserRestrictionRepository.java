package com.rich.sodam.repository;

import com.rich.sodam.domain.ChatUserRestriction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatUserRestrictionRepository extends JpaRepository<ChatUserRestriction, Long> {
}
