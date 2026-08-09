package com.rich.sodam.config.integration;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ObjectStorageTest {

    @Test
    void livePutUsesPrivateS3ObjectAndNeverReturnsPresignedUrlForPersistence() throws Exception {
        S3Client s3 = mock(S3Client.class);
        S3Presigner presigner = mock(S3Presigner.class);
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);
        when(presigned.url()).thenReturn(new URL("https://private-bucket.s3.amazonaws.com/object?signature=opaque"));
        ObjectStorage storage = new ObjectStorage("live", "private-bucket", "ap-northeast-2",
                Duration.ofMinutes(10), s3, presigner);

        ObjectStorage.PutResult result = storage.put("stores/7/photos", "image".getBytes(StandardCharsets.UTF_8), "image/png");

        ArgumentCaptor<PutObjectRequest> put = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3).putObject(put.capture(), any(RequestBody.class));
        assertThat(put.getValue().bucket()).isEqualTo("private-bucket");
        assertThat(put.getValue().key()).startsWith("stores/7/photos/").endsWith(".png");
        assertThat(put.getValue().acl()).isNull();
        assertThat(result.getStorageKey()).isEqualTo(put.getValue().key());
        assertThat(result.getPublicUrl()).isNull();

        assertThat(storage.accessUrl(result.getStorageKey())).contains("signature=opaque");

        ArgumentCaptor<GetObjectPresignRequest> sign = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(presigner).presignGetObject(sign.capture());
        assertThat(sign.getValue().signatureDuration()).isEqualTo(Duration.ofMinutes(10));
        assertThat(sign.getValue().getObjectRequest().bucket()).isEqualTo("private-bucket");
    }

    @Test
    void liveGetAndDeleteKeepExistingByteApi() {
        S3Client s3 = mock(S3Client.class);
        S3Presigner presigner = mock(S3Presigner.class);
        @SuppressWarnings("unchecked")
        ResponseBytes<GetObjectResponse> response = mock(ResponseBytes.class);
        when(response.asByteArray()).thenReturn("receipt".getBytes(StandardCharsets.UTF_8));
        when(s3.getObjectAsBytes(any(GetObjectRequest.class))).thenReturn(response);
        ObjectStorage storage = new ObjectStorage("live", "private-bucket", "ap-northeast-2",
                Duration.ofMinutes(15), s3, presigner);

        assertThat(storage.get("stores/7/purchases/receipt.jpg")).contains("receipt".getBytes(StandardCharsets.UTF_8));
        storage.delete("stores/7/purchases/receipt.jpg");

        ArgumentCaptor<GetObjectRequest> get = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(s3).getObjectAsBytes(get.capture());
        assertThat(get.getValue().bucket()).isEqualTo("private-bucket");
        verify(s3).deleteObject(DeleteObjectRequest.builder()
                .bucket("private-bucket").key("stores/7/purchases/receipt.jpg").build());
    }

    @Test
    void rejectsTraversalAndInvalidLiveConfiguration() {
        assertThatThrownBy(() -> new ObjectStorage("live", "", "ap-northeast-2", Duration.ofMinutes(15), null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SODAM_OBJECT_STORAGE_BUCKET");
        assertThatThrownBy(() -> new ObjectStorage("mock", "", "ap-northeast-2", Duration.ofMinutes(15), null, null)
                .put("../outside", new byte[]{1}, "image/png"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void mockAccessUrlPreservesTheExistingLocalUrlContract() {
        ObjectStorage storage = new ObjectStorage("mock", "", "ap-northeast-2", Duration.ofMinutes(15), null, null);

        assertThat(storage.accessUrl("users/1/avatar/photo.jpg"))
                .isEqualTo("/uploads/users/1/avatar/photo.jpg");
        assertThatThrownBy(() -> storage.accessUrl("../private-file"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
