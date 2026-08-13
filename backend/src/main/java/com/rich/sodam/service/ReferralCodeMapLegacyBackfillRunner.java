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

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
        // 이관이 끝난 뒤의 재기동에서는 즉시 빠져나간다. 이 가드가 없으면 사용자 수에 비례한
        // 조회가 부팅마다 반복된다(사용자 2만 명 = 매 기동 4만 쿼리).
        long userCount = userRepository.count();
        if (referralCodeMapRepository.count() >= userCount) {
            log.debug("추천 코드 레거시 매핑 이관 생략: 이미 완료됨(users={})", userCount);
            return;
        }

        int pageNumber = 0;
        long created = 0;
        long collisions = 0;
        Page<User> page;
        do {
            page = userRepository.findAll(PageRequest.of(pageNumber++, PAGE_SIZE, Sort.by("id").ascending()));
            List<Long> userIds = page.getContent().stream().map(User::getId).toList();
            // 페이지당 2회 조회로 고정한다 — 사용자 1명당 2회 조회하면 이관이 O(사용자 수) 왕복이 된다.
            Set<Long> mappedUserIds = new HashSet<>(referralCodeMapRepository.findUserIdsByUserIdIn(userIds));
            Map<Long, String> legacyCodes = new LinkedHashMap<>();
            for (Long userId : userIds) {
                if (!mappedUserIds.contains(userId)) {
                    legacyCodes.put(userId, ReferralCodeGenerator.legacyCodeForUserId(userId));
                }
            }
            Set<String> takenCodes = legacyCodes.isEmpty()
                    ? new HashSet<>()
                    : new HashSet<>(referralCodeMapRepository.findCodesByCodeIn(legacyCodes.values()));

            for (Map.Entry<Long, String> entry : legacyCodes.entrySet()) {
                // 같은 페이지 안에서 레거시 코드가 겹치는 경우까지 막는다.
                if (!takenCodes.add(entry.getValue())) {
                    collisions++;
                    continue;
                }
                referralCodeMapRepository.save(ReferralCodeMap.issue(entry.getValue(), entry.getKey()));
                created++;
            }
            referralCodeMapRepository.flush();
        } while (page.hasNext());
        if (created > 0 || collisions > 0) {
            log.info("추천 코드 레거시 매핑 이관 완료: 생성={} 충돌={}", created, collisions);
        }
    }
}
