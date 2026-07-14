package com.rich.sodam.dto.response;

import com.rich.sodam.domain.CustomerInquiry;

import java.time.LocalDateTime;

public record CustomerInquiryResponse(Long id, String name, String email, String content, LocalDateTime createdAt) {

    public static CustomerInquiryResponse from(CustomerInquiry inquiry) {
        return new CustomerInquiryResponse(
                inquiry.getId(), inquiry.getName(), inquiry.getEmail(), inquiry.getContent(), inquiry.getCreatedAt());
    }
}
