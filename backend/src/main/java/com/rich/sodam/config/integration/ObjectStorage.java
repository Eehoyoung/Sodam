package com.rich.sodam.config.integration;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * 사용자 업로드 파일 저장소. mock은 로컬 디스크, live는 private AWS S3 bucket을 사용한다.
 *
 * <p>live 모드는 AWS SDK의 기본 자격 증명 체인(환경 변수, ECS/EKS/EC2 역할 등)을 그대로
 * 사용한다. 객체 ACL을 public-read로 설정하지 않으며, 업로드 응답 URL은 제한 시간의 GET
 * presigned URL이다.</p>
 */
@Slf4j
@Component
public class ObjectStorage {

    private static final Path LOCAL_ROOT = Path.of("./uploads").toAbsolutePath().normalize();
    private static final Duration MAX_PRESIGNED_GET_TTL = Duration.ofDays(7);

    private final Mode mode;
    private final String bucket;
    private final Duration presignedGetTtl;
    private final S3Client s3;
    private final S3Presigner presigner;

    @Autowired
    public ObjectStorage(
            @Value("${sodam.integration.object-storage.mode:mock}") String mode,
            @Value("${sodam.integration.object-storage.bucket:}") String bucket,
            @Value("${sodam.integration.object-storage.region:ap-northeast-2}") String region,
            @Value("${sodam.integration.object-storage.presigned-get-ttl:15m}") Duration presignedGetTtl) {
        this(mode, bucket, region, presignedGetTtl, createS3Client(mode, region), createPresigner(mode, region));
    }

    ObjectStorage(String mode, String bucket, String region, Duration presignedGetTtl,
                  S3Client s3, S3Presigner presigner) {
        this.mode = Mode.from(mode);
        this.bucket = bucket == null ? "" : bucket.trim();
        this.presignedGetTtl = requireValidTtl(presignedGetTtl);
        if (this.mode == Mode.LIVE) {
            require(this.bucket, "SODAM_OBJECT_STORAGE_BUCKET");
            require(region, "SODAM_OBJECT_STORAGE_REGION");
            this.s3 = Objects.requireNonNull(s3, "live S3 client is required");
            this.presigner = Objects.requireNonNull(presigner, "live S3 presigner is required");
        } else {
            this.s3 = null;
            this.presigner = null;
        }
    }

    public PutResult put(String prefix, byte[] data, String contentType) {
        if (data == null) {
            throw new IllegalArgumentException("저장할 파일 데이터가 없습니다.");
        }
        String key = safePrefix(prefix) + "/" + UUID.randomUUID() + inferExt(contentType);
        if (mode == Mode.LIVE) {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType == null ? "application/octet-stream" : contentType)
                    // public-read ACL을 지정하지 않는다. private bucket 정책이 유일한 접근 제어다.
                    .build();
            s3.putObject(request, RequestBody.fromBytes(data));
            log.info("[Storage S3] put {} ({} bytes)", key, data.length);
            // Presigned URL is an ephemeral bearer credential. Never hand it to a
            // persistence caller; API response assembly calls accessUrl(key) later.
            return new PutResult(key, null);
        }

        try {
            Path target = safeLocalPath(key);
            Files.createDirectories(target.getParent());
            Files.write(target, data);
            log.info("[Storage MOCK] put {} ({} bytes)", key, data.length);
            return new PutResult(key, "/uploads/" + key);
        } catch (IOException e) {
            log.error("Storage put failed", e);
            throw new IllegalStateException("파일 저장에 실패했습니다.", e);
        }
    }

    public void delete(String key) {
        String safeKey = safeKey(key);
        if (mode == Mode.LIVE) {
            try {
                s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(safeKey).build());
                log.info("[Storage S3] delete {}", safeKey);
            } catch (S3Exception e) {
                log.warn("Storage S3 delete failed key={} status={}", safeKey, e.statusCode());
            }
            return;
        }

        try {
            Files.deleteIfExists(safeLocalPath(safeKey));
            log.info("[Storage MOCK] delete {}", safeKey);
        } catch (IOException e) {
            log.warn("Storage MOCK delete failed key={} reason={}", safeKey, e.getMessage());
        }
    }

    /** 저장된 바이트를 조회한다. 호출부의 인증·인가 확인은 이 저장소 바깥의 서비스가 담당한다. */
    public Optional<byte[]> get(String key) {
        String safeKey = safeKey(key);
        if (mode == Mode.LIVE) {
            try {
                ResponseBytes<GetObjectResponse> response = s3.getObjectAsBytes(GetObjectRequest.builder()
                        .bucket(bucket).key(safeKey).build());
                return Optional.of(response.asByteArray());
            } catch (S3Exception e) {
                log.warn("Storage S3 get failed key={} status={}", safeKey, e.statusCode());
                return Optional.empty();
            }
        }

        try {
            Path target = safeLocalPath(safeKey);
            return Files.exists(target) ? Optional.of(Files.readAllBytes(target)) : Optional.empty();
        } catch (IOException e) {
            log.warn("Storage MOCK get failed key={} reason={}", safeKey, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * 현재 시점의 파일 접근 URL을 만든다. live URL은 DB에 저장하지 않고 응답 직전에 생성해야
     * 만료된 presigned URL을 재사용하지 않는다.
     */
    public String accessUrl(String key) {
        String safeKey = safeKey(key);
        return mode == Mode.LIVE ? presignedGetUrl(safeKey) : "/uploads/" + safeKey;
    }

    /** True only when the stored object URL must be generated per response. */
    public boolean isLive() {
        return mode == Mode.LIVE;
    }

    private String presignedGetUrl(String key) {
        GetObjectRequest objectRequest = GetObjectRequest.builder().bucket(bucket).key(key).build();
        return presigner.presignGetObject(GetObjectPresignRequest.builder()
                        .signatureDuration(presignedGetTtl)
                        .getObjectRequest(objectRequest)
                        .build())
                .url()
                .toExternalForm();
    }

    private static S3Client createS3Client(String mode, String region) {
        return Mode.from(mode) == Mode.LIVE ? S3Client.builder().region(Region.of(require(region,
                "SODAM_OBJECT_STORAGE_REGION"))).build() : null;
    }

    private static S3Presigner createPresigner(String mode, String region) {
        return Mode.from(mode) == Mode.LIVE ? S3Presigner.builder().region(Region.of(require(region,
                "SODAM_OBJECT_STORAGE_REGION"))).build() : null;
    }

    private static Duration requireValidTtl(Duration ttl) {
        if (ttl == null || ttl.isZero() || ttl.isNegative() || ttl.compareTo(MAX_PRESIGNED_GET_TTL) > 0) {
            throw new IllegalStateException("SODAM_OBJECT_STORAGE_PRESIGNED_GET_TTL must be between 1 second and 7 days");
        }
        return ttl;
    }

    private static String safePrefix(String prefix) {
        return safeKey(prefix);
    }

    private static String safeKey(String key) {
        if (key == null || key.isBlank() || key.startsWith("/") || key.startsWith("\\") || key.contains("\\")) {
            throw new IllegalArgumentException("허용되지 않은 object key입니다.");
        }
        for (String segment : key.split("/")) {
            if (segment.isBlank() || segment.equals(".") || segment.equals("..")) {
                throw new IllegalArgumentException("허용되지 않은 object key입니다.");
            }
        }
        return key;
    }

    private static Path safeLocalPath(String key) {
        Path path = LOCAL_ROOT.resolve(key).normalize();
        if (!path.startsWith(LOCAL_ROOT)) {
            throw new IllegalArgumentException("허용되지 않은 object key입니다.");
        }
        return path;
    }

    private static String require(String value, String envName) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(envName + " configuration is required in live mode");
        }
        return value.trim();
    }

    private String inferExt(String contentType) {
        if (contentType == null) return ".bin";
        if (contentType.contains("png")) return ".png";
        if (contentType.contains("jpeg") || contentType.contains("jpg")) return ".jpg";
        if (contentType.contains("pdf")) return ".pdf";
        return ".bin";
    }

    private enum Mode {
        MOCK, LIVE;

        private static Mode from(String value) {
            return value != null && value.trim().equalsIgnoreCase("live") ? LIVE : MOCK;
        }
    }

    @Getter
    @AllArgsConstructor
    public static class PutResult {
        private final String storageKey;
        private final String publicUrl;
    }
}
