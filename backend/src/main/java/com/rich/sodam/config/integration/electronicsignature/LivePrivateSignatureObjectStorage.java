package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.PrivateSignatureObjectStorage;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

import java.io.InputStream;
import java.net.URI;
import java.util.UUID;

/** live 전자서명 증적 저장. SSE-KMS·private bucket을 전제로 하며 public URL을 만들지 않는다. */
@Component
@ConditionalOnProperty(prefix = "sodam.integration.electronic-signature", name = "mode", havingValue = "live")
public class LivePrivateSignatureObjectStorage implements PrivateSignatureObjectStorage {
    private final IntegrationProperties.ElectronicSignature config;
    private final S3Client s3;

    public LivePrivateSignatureObjectStorage(IntegrationProperties properties) {
        this.config = properties.getElectronicSignature();
        S3ClientBuilder builder = S3Client.builder().region(Region.of(config.getStorageRegion()));
        if (config.getStorageEndpoint() != null && !config.getStorageEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(config.getStorageEndpoint().trim()));
        }
        this.s3 = builder.build();
    }

    @PostConstruct
    void validate() {
        require(config.getStorageBucket(), "ESIGN_STORAGE_BUCKET");
        require(config.getStorageKmsKeyId(), "ESIGN_STORAGE_KMS_KEY_ID");
    }

    @Override
    public String put(ObjectKind kind, Long envelopeId, InputStream source, long contentLength, String contentType) {
        if (kind == null || envelopeId == null || source == null || contentLength < 0) {
            throw new IllegalArgumentException("전자서명 객체 저장 인자가 올바르지 않습니다.");
        }
        String ref = "esign/" + kind.name().toLowerCase() + "/" + envelopeId + "/" + UUID.randomUUID();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(config.getStorageBucket())
                .key(ref)
                .contentType(contentType == null ? "application/octet-stream" : contentType)
                .serverSideEncryption(ServerSideEncryption.AWS_KMS)
                .ssekmsKeyId(config.getStorageKmsKeyId())
                .build();
        s3.putObject(request, RequestBody.fromInputStream(source, contentLength));
        return ref;
    }

    @Override
    public InputStream open(String opaqueObjectRef) {
        ResponseInputStream<GetObjectResponse> stream = s3.getObject(GetObjectRequest.builder()
                .bucket(config.getStorageBucket()).key(requireRef(opaqueObjectRef)).build());
        return stream;
    }

    @Override
    public void delete(String opaqueObjectRef) {
        s3.deleteObject(DeleteObjectRequest.builder()
                .bucket(config.getStorageBucket()).key(requireRef(opaqueObjectRef)).build());
    }

    private String requireRef(String ref) {
        if (ref == null || !ref.startsWith("esign/") || ref.contains("..")) {
            throw new IllegalArgumentException("허용되지 않은 object ref입니다.");
        }
        return ref;
    }

    private void require(String value, String env) {
        if (value == null || value.isBlank()) throw new IllegalStateException(env + " 설정이 필요합니다.");
    }
}
