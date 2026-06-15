package com.rich.sodam.config;

import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.repository.LaborInfoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * test 프로필 전용 노무 정보 시드.
 *
 * LaborInfoIntegrationTest 의 전체조회/최근조회 테스트는 기본 데이터(>=5건)를 전제한다
 * (기존 주석: "data.sql에서 기본 데이터 로드됨"). H2 인메모리 환경에서는 data.sql 대신
 * 컨텍스트 시작 시 시드를 커밋해 모든 테스트 메서드의 트랜잭션에서 보이도록 한다.
 *
 * 운영 코드에는 포함되지 않는다 (테스트 소스 트리 + @Profile("test")).
 */
@Component
@Profile("test")
@Order(0)
public class TestLaborInfoSeedRunner implements CommandLineRunner {

    private final LaborInfoRepository laborInfoRepository;

    public TestLaborInfoSeedRunner(LaborInfoRepository laborInfoRepository) {
        this.laborInfoRepository = laborInfoRepository;
    }

    @Override
    public void run(String... args) {
        if (laborInfoRepository.count() >= 5) {
            return;
        }
        for (int i = 1; i <= 6; i++) {
            LaborInfo info = new LaborInfo();
            info.setTitle("기본 노무 정보 " + i);
            info.setContent("기본 노무 정보 내용 " + i + " 입니다.");
            info.setImagePath("uploads/seed-" + i + ".jpg");
            info.setYear(2024 + (i % 2));
            info.setMinimumWage(9860 + i);
            info.setWeeklyMaxHours(52);
            info.setOvertimeRate(1.5);
            laborInfoRepository.save(info);
        }
    }
}
