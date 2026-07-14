package com.rich.sodam.repository;

import com.rich.sodam.domain.CustomerInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerInquiryRepository extends JpaRepository<CustomerInquiry, Long> {
}
