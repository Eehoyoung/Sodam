package com.rich.sodam.personal.repository;

import com.rich.sodam.personal.domain.PersonalUserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalUserProfileRepository extends JpaRepository<PersonalUserProfile, Long> {
}
