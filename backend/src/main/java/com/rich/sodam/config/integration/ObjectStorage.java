package com.rich.sodam.config.integration;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * 객체 저장소 추상화 — 매장 사진 등 사용자 업로드 파일 영구 저장.
 *
 * dev: 로컬 디스크 (`./uploads/`)
 * live: AWS S3
 *
 * TODO[CONFIRM-C-6 후]: AWS SDK 도입 후 LiveS3ObjectStorage 추가 + bean swap.
 */
@Slf4j
@Component
public class ObjectStorage {

    private static final Path LOCAL_ROOT = Paths.get("./uploads");

    public PutResult put(String prefix, byte[] data, String contentType) {
        try {
            String ext = inferExt(contentType);
            String key = prefix + "/" + UUID.randomUUID() + ext;
            Path target = LOCAL_ROOT.resolve(key);
            Files.createDirectories(target.getParent());
            Files.write(target, data);
            String publicUrl = "/uploads/" + key; // dev 정적 서빙 시 가정
            log.info("[Storage MOCK] put {} ({} bytes)", key, data.length);
            return new PutResult(key, publicUrl);
        } catch (IOException e) {
            log.error("Storage put 실패", e);
            throw new RuntimeException("파일 저장 실패", e);
        }
    }

    public void delete(String key) {
        try {
            Files.deleteIfExists(LOCAL_ROOT.resolve(key));
            log.info("[Storage MOCK] delete {}", key);
        } catch (IOException e) {
            log.warn("Storage delete 실패 key={} reason={}", key, e.getMessage());
        }
    }

    private String inferExt(String contentType) {
        if (contentType == null) return ".bin";
        if (contentType.contains("png")) return ".png";
        if (contentType.contains("jpeg") || contentType.contains("jpg")) return ".jpg";
        if (contentType.contains("pdf")) return ".pdf";
        return ".bin";
    }

    @Getter
    @AllArgsConstructor
    public static class PutResult {
        private final String storageKey;
        private final String publicUrl;
    }
}
