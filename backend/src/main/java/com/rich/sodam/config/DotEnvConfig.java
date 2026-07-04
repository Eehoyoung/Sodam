package com.rich.sodam.config;

import io.github.cdimascio.dotenv.Dotenv;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class DotEnvConfig {

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

            dotenv.entries().forEach(entry -> {
                String key = entry.getKey();
                String value = entry.getValue();

                if (System.getProperty(key) == null) {
                    System.setProperty(key, value);
                    System.out.println("[DEBUG_LOG] env loaded: " + key + " = " + maskIfSensitive(key, value));
                }
            });

            System.out.println("[DEBUG_LOG] loaded " + dotenv.entries().size() + " values from .env");
        } catch (Exception e) {
            System.err.println("[DEBUG_LOG] failed to load .env: " + e.getMessage());
            System.out.println("[DEBUG_LOG] using system environment variables or application.yml defaults");
        }
    }

    private static String maskIfSensitive(String key, String value) {
        String normalized = key == null ? "" : key.toLowerCase();
        if (normalized.contains("password")
                || normalized.contains("secret")
                || normalized.contains("token")
                || normalized.contains("key")
                || normalized.contains("credential")) {
            return "***";
        }
        return value;
    }
}
