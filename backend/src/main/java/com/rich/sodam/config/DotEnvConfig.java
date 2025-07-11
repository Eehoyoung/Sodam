package com.rich.sodam.config;

import io.github.cdimascio.dotenv.Dotenv;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

/**
 * DotEnv 설정 클래스
 * .env 파일의 환경변수를 시스템 프로퍼티로 로드합니다.
 */
@Slf4j
@Configuration
public class DotEnvConfig {

    // static 블록을 사용하여 클래스 로딩 시점에 .env 파일을 로드
    static {
        loadDotEnvFile();
    }

    private static void loadDotEnvFile() {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory(".")
                    .filename(".env")
                    .ignoreIfMalformed()
                    .ignoreIfMissing()
                    .load();

            // .env 파일의 모든 환경변수를 시스템 프로퍼티로 설정
            dotenv.entries().forEach(entry -> {
                String key = entry.getKey();
                String value = entry.getValue();

                // 시스템 프로퍼티에 이미 설정된 값이 없는 경우에만 설정
                if (System.getProperty(key) == null) {
                    System.setProperty(key, value);
                    System.out.println("[DEBUG_LOG] 환경변수 로드: " + key + " = " +
                            (key.toLowerCase().contains("password") || key.toLowerCase().contains("secret")
                                    ? "***" : value));
                }
            });

            System.out.println("[DEBUG_LOG] .env 파일에서 " + dotenv.entries().size() + "개의 환경변수를 성공적으로 로드했습니다.");

        } catch (Exception e) {
            System.err.println("[DEBUG_LOG] .env 파일 로드 중 오류 발생: " + e.getMessage());
            System.out.println("[DEBUG_LOG] 환경변수는 시스템 환경변수 또는 application.yml의 기본값을 사용합니다.");
        }
    }
}
