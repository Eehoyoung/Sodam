package com.rich.sodam.service;

import com.rich.sodam.domain.CustomerInquiry;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.CustomerInquiryCreateRequest;
import com.rich.sodam.dto.response.CustomerInquiryResponse;
import com.rich.sodam.repository.CustomerInquiryRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomerInquiryService {

    private final CustomerInquiryRepository customerInquiryRepository;
    private final UserRepository userRepository;

    @Transactional
    public CustomerInquiryResponse submit(Long requesterId, CustomerInquiryCreateRequest req) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없어요: " + requesterId));
        CustomerInquiry inquiry = CustomerInquiry.create(requester, req.getName(), req.getEmail(), req.getContent());
        return CustomerInquiryResponse.from(customerInquiryRepository.save(inquiry));
    }
}
