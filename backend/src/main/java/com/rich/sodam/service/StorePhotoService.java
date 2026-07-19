package com.rich.sodam.service;

import com.rich.sodam.config.integration.ObjectStorage;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StorePhoto;
import com.rich.sodam.repository.StorePhotoRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 매장 사진 업로드/삭제/조회 (WP-09: {@code StorePhotoController} 의 repository·storage 직접 조율 이관).
 *
 * <p>인가 검증({@code StoreAccessGuard.assertMasterOwnsStore})은 컨트롤러 책임으로 그대로 남는다 —
 * 이 서비스는 검증 이후의 조회/저장/파일 저장소 조율 로직만 담당한다.
 */
@Service
@RequiredArgsConstructor
public class StorePhotoService {

    private static final int MAX_PHOTOS_PER_STORE = 5;
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    private final StorePhotoRepository storePhotoRepository;
    private final StoreRepository storeRepository;
    private final ObjectStorage objectStorage;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long storeId) {
        return storePhotoRepository.findByStore_IdOrderByDisplayOrderAsc(storeId)
                .stream().map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("publicUrl", p.getPublicUrl());
                    m.put("displayOrder", p.getDisplayOrder());
                    m.put("uploadedAt", p.getUploadedAt());
                    return m;
                }).toList();
    }

    /**
     * 한 번에 1장. JPG/PNG. 최대 5MB. 매장당 최대 5장.
     * 실패 사유는 {@link UploadResult#message()} 로 전달 — 컨트롤러가 200/400 매핑을 그대로 유지한다.
     */
    @Transactional(rollbackFor = Exception.class)
    public UploadResult upload(Long storeId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return UploadResult.failure("파일이 비어 있어요.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            return UploadResult.failure("5MB 이하 사진만 업로드할 수 있어요.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        if (!contentType.startsWith("image/")) {
            return UploadResult.failure("이미지 파일만 업로드할 수 있어요.");
        }

        long currentCount = storePhotoRepository.countByStore_Id(storeId);
        if (currentCount >= MAX_PHOTOS_PER_STORE) {
            return UploadResult.failure("사진은 매장당 최대 " + MAX_PHOTOS_PER_STORE + "장까지 등록할 수 있어요.");
        }

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요."));

        ObjectStorage.PutResult res = objectStorage.put(
                "stores/" + storeId + "/photos",
                file.getBytes(),
                contentType);

        StorePhoto saved = storePhotoRepository.save(StorePhoto.of(
                store, res.getStorageKey(), res.getPublicUrl(),
                (int) currentCount, contentType, file.getSize()));

        Map<String, Object> body = Map.of(
                "id", saved.getId(),
                "publicUrl", saved.getPublicUrl(),
                "displayOrder", saved.getDisplayOrder()
        );
        return UploadResult.success(body);
    }

    @Transactional
    public void delete(Long storeId, Long photoId) {
        storePhotoRepository.findById(photoId).ifPresent(photo -> {
            if (photo.getStore() == null || !storeId.equals(photo.getStore().getId())) return;
            objectStorage.delete(photo.getStorageKey());
            storePhotoRepository.delete(photo);
        });
    }

    /** 업로드 결과. {@code success=false} 면 {@code message} 가 실패 사유, 성공 시 {@code body} 가 응답 페이로드. */
    public record UploadResult(boolean success, String message, Map<String, Object> body) {
        static UploadResult failure(String message) {
            return new UploadResult(false, message, null);
        }

        static UploadResult success(Map<String, Object> body) {
            return new UploadResult(true, null, body);
        }
    }
}
