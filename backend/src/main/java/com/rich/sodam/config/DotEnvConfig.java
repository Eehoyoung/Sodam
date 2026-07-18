package com.rich.sodam.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;

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
                }
            });

            System.out.println("[DotEnv] loaded " + dotenv.entries().size() + " environment entries");
        } catch (Exception e) {
            System.err.println("[DotEnv] .env load skipped; using environment variables or application defaults");
        }
    }
}
