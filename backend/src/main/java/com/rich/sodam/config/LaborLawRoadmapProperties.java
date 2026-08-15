package com.rich.sodam.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 5인 미만 사업장 근로기준법 확대적용 정부 추진 로드맵(G-19: 미확정 정책 안내).
 *
 * <p>법령이 확정·개정되면 이 파일(application.yml의 {@code sodam.labor-law-roadmap.items})만
 * 갱신하면 된다 — {@link com.rich.sodam.service.StatutoryHeadcountService} 코드는 변경하지 않는다.
 * 항목은 전부 "정부가 추진 중인 계획"이지 확정 시행일이 아니다 — description에도 그 표현을 유지할 것.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.labor-law-roadmap")
public class LaborLawRoadmapProperties {

    private List<Item> items = new ArrayList<>();

    @Getter
    @Setter
    public static class Item {
        private int stage;
        private int expectedYear;
        private String title;
        private String description;
    }
}
