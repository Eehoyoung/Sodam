package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.CustomerInquiryCreateRequest;
import com.rich.sodam.dto.response.CustomerInquiryResponse;
import com.rich.sodam.repository.CustomerInquiryRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Q&A 화면 1:1 문의 저장 (findings_report.md §1-3).
 * 이전에는 FE가 저장 API를 아예 호출하지 않고 성공 토스트만 띄웠다 — 실제 영속화 여부를 검증한다.
 */
@DataJpaTest
@ActiveProfiles("test")
@Import(CustomerInquiryService.class)
class CustomerInquiryServiceTest {

    @Autowired
    private CustomerInquiryService service;

    @Autowired
    private CustomerInquiryRepository repository;

    @Autowired
    private UserRepository userRepository;

    private CustomerInquiryCreateRequest req(String name, String email, String content) {
        CustomerInquiryCreateRequest r = new CustomerInquiryCreateRequest();
        r.setName(name);
        r.setEmail(email);
        r.setContent(content);
        return r;
    }

    @Test
    @DisplayName("문의 접수 시 실제로 DB에 저장된다")
    void submitPersistsInquiry() {
        User requester = userRepository.save(new User("inquiry_user1@x.com", "문의자"));

        CustomerInquiryResponse response = service.submit(
                requester.getId(), req("홍길동", "hong@example.com", "출퇴근 화면에서 오류가 나요."));

        assertThat(response.id()).isNotNull();
        assertThat(repository.findById(response.id())).isPresent();
        assertThat(repository.findById(response.id()).get().getContent())
                .isEqualTo("출퇴근 화면에서 오류가 나요.");
        assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("존재하지 않는 사용자면 예외")
    void submitRejectsUnknownUser() {
        assertThat(repository.count()).isZero();
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> service.submit(999999L, req("홍길동", "hong@example.com", "문의 내용")));
    }
}
