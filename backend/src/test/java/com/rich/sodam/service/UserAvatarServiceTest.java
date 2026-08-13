package com.rich.sodam.service;

import com.rich.sodam.config.integration.ObjectStorage;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.TermsAgreementRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 사용자 아바타(프로필 사진) 업로드/삭제 — StorePhotoService 와 동일한 검증 규칙(빈 파일/5MB 초과/image 아님),
 * 교체 시 기존 파일 정리(ObjectStorage.delete), 삭제(초기화) 케이스를 검증한다.
 * ObjectStorage 는 mock 처리해 실제 파일시스템을 건드리지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class UserAvatarServiceTest {

    @Mock
    UserRepository userRepository;
    @Mock
    SubscriptionRepository subscriptionRepository;
    @Mock
    TermsAgreementRepository termsAgreementRepository;
    @Mock
    PasswordEncoder passwordEncoder;
    @Mock
    ObjectStorage objectStorage;

    @InjectMocks
    UserService userService;

    private User user;

    @BeforeEach
    void setUp() throws Exception {
        user = new User("avatar@sodam.dev", "아바타테스트");
        setId(user, 1L);
    }

    private void setId(User user, Long id) throws Exception {
        Field idField = User.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(user, id);
    }

    @Test
    @DisplayName("업로드 성공 — ObjectStorage.put 결과로 avatarUrl/avatarKey 갱신")
    void uploadAvatar_success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "profile.png", "image/png", "fake-image-bytes".getBytes());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(objectStorage.put(eq("users/1/avatar"), any(byte[].class), eq("image/png")))
                .thenReturn(new ObjectStorage.PutResult("users/1/avatar/uuid.png", "/uploads/users/1/avatar/uuid.png"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.uploadAvatar(1L, file);

        assertThat(result.getAvatarUrl()).isNull();
        assertThat(result.getAvatarKey()).isEqualTo("users/1/avatar/uuid.png");
        verify(objectStorage, never()).delete(anyString()); // 기존 파일 없었으므로 delete 호출 안 됨
    }

    @Test
    @DisplayName("업로드 실패 — 빈 파일")
    void uploadAvatar_emptyFile_fails() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> userService.uploadAvatar(1L, emptyFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("파일이 비어");

        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("업로드 실패 — 5MB 초과")
    void uploadAvatar_tooLarge_fails() {
        byte[] oversized = new byte[(int) (5 * 1024 * 1024) + 1];
        MockMultipartFile bigFile = new MockMultipartFile("file", "big.png", "image/png", oversized);

        assertThatThrownBy(() -> userService.uploadAvatar(1L, bigFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5MB");

        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("업로드 실패 — 이미지가 아닌 파일")
    void uploadAvatar_notImage_fails() {
        MockMultipartFile pdf = new MockMultipartFile(
                "file", "doc.pdf", "application/pdf", "fake-pdf-bytes".getBytes());

        assertThatThrownBy(() -> userService.uploadAvatar(1L, pdf))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이미지 파일만");

        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("업로드 실패 — 존재하지 않는 사용자")
    void uploadAvatar_userNotFound_fails() {
        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", "bytes".getBytes());
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.uploadAvatar(999L, file))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("교체 업로드 — 기존 avatarKey 가 있으면 새 파일 저장 전 기존 파일을 delete")
    void uploadAvatar_replacesExisting_deletesOldKey() throws Exception {
        user.updateAvatar("/uploads/users/1/avatar/old.png", "users/1/avatar/old.png");
        MockMultipartFile file = new MockMultipartFile("file", "new.png", "image/png", "new-bytes".getBytes());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(objectStorage.put(eq("users/1/avatar"), any(byte[].class), eq("image/png")))
                .thenReturn(new ObjectStorage.PutResult("users/1/avatar/new.png", "/uploads/users/1/avatar/new.png"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.uploadAvatar(1L, file);

        verify(objectStorage, times(1)).delete("users/1/avatar/old.png");
        assertThat(result.getAvatarUrl()).isNull();
        assertThat(result.getAvatarKey()).isEqualTo("users/1/avatar/new.png");
    }

    @Test
    @DisplayName("삭제(초기화) — 기존 파일 delete + 컬럼 null화")
    void deleteAvatar_clearsAndDeletesOldFile() {
        user.updateAvatar("/uploads/users/1/avatar/old.png", "users/1/avatar/old.png");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.deleteAvatar(1L);

        verify(objectStorage, times(1)).delete("users/1/avatar/old.png");
        assertThat(result.getAvatarUrl()).isNull();
        assertThat(result.getAvatarKey()).isNull();
    }

    @Test
    @DisplayName("삭제(초기화) — 이미 아바타가 없으면 delete 호출 없이 그대로 null 유지")
    void deleteAvatar_noExistingAvatar_noDeleteCall() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.deleteAvatar(1L);

        verify(objectStorage, never()).delete(anyString());
        assertThat(result.getAvatarUrl()).isNull();
        assertThat(result.getAvatarKey()).isNull();
    }

    @Test
    void resolveAvatarUrl_doesNotExposeLegacyPublicUrlInLiveMode() {
        user.updateAvatar("https://legacy-public.example/avatar.png", null);
        when(objectStorage.isLive()).thenReturn(true);

        assertThat(userService.resolveAvatarUrl(user)).isNull();
    }
}
