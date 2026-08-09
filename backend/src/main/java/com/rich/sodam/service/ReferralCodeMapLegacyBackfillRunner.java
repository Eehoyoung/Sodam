package com.rich.sodam.service;

import com.rich.sodam.domain.ReferralCodeMap;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.ReferralCodeMapRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/**
 * V81 전 사용자에게 발급됐던 결정적 추천 코드를 매핑 테이블로 보존한다.
 *
 * <p>사용자 ID 오름차순으로 처리해 레거시 충돌이 있었다면 과거 O(100만) 탐색과 같은 가장 작은 ID를
 * 유지한다. 새 사용자의 코드는 {@link ReferralCodeGenerator#randomCode()}로만 발급된다.</p>
 */
@Component
@Profile("prod")
@RequiredArgsConstructor
@Slf4j
public class ReferralCodeMapLegacyBackfillRunner implements ApplicationRunner {

    private static final int PAGE_SIZE = 500;

    private final UserRepository userRepository;
    private final ReferralCodeMapRepository referralCodeMapRepository;

    @Override
    public void run(ApplicationArguments args) {
        int pageNumber = 0;
        long created = 0;
        long collisions = 0;
        Page<User> page;
        do {
            page = userRepository.findAll(PageRequest.of(pageNumber++, PAGE_SIZE, Sort.by("id").ascending()));
            for (User user : page.getContent()) {
                if (referralCodeMapRepository.findByUserId(user.getId()).isPresent()) {
                    continue;
                }
                String legacyCode = ReferralCodeGenerator.legacyCodeForUserId(user.getId());
                if (referralCodeMapRepository.findByCode(legacyCode).isPresent()) {
                    collisions++;
                    continue;
                }
                referralCodeMapRepository.save(ReferralCodeMap.issue(legacyCode, user.getId()));
                created++;
            }
            referralCodeMapRepository.flush();
        } while (page.hasNext());
        if (created > 0 || collisions > 0) {
            log.info("추천 코드 레거시 매핑 이관 완료: 생성={} 충돌={}", created, collisions);
        }
    }
}
