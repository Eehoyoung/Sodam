package com.rich.sodam.controller;

import com.rich.sodam.config.integration.ObjectStorage;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StorePhoto;
import com.rich.sodam.repository.StorePhotoRepository;
import com.rich.sodam.repository.StoreRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.rich.sodam.security.annotation.MasterOnly;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/photos")
@RequiredArgsConstructor
@Tag(name = "매장 사진", description = "매장 사진 업로드/삭제/조회")
public class StorePhotoController {

    private static final int MAX_PHOTOS_PER_STORE = 5;
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    private final StorePhotoRepository storePhotoRepository;
    private final StoreRepository storeRepository;
    private final ObjectStorage objectStorage;

    @Operation(summary = "매장 사진 목록")
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> list(@PathVariable Long storeId) {
        var photos = storePhotoRepository.findByStore_IdOrderByDisplayOrderAsc(storeId)
                .stream().map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("publicUrl", p.getPublicUrl());
                    m.put("displayOrder", p.getDisplayOrder());
                    m.put("uploadedAt", p.getUploadedAt());
                    return m;
                }).toList();
        return ResponseEntity.ok(photos);
    }

    @Operation(summary = "매장 사진 업로드",
            description = "한 번에 1장. JPG/PNG. 최대 5MB. 매장당 최대 5장.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> upload(
            @PathVariable Long storeId,
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "파일이 비어 있어요."));
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("message", "5MB 이하 사진만 업로드할 수 있어요."));
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        if (!contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미지 파일만 업로드할 수 있어요."));
        }

        long currentCount = storePhotoRepository.countByStore_Id(storeId);
        if (currentCount >= MAX_PHOTOS_PER_STORE) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "사진은 매장당 최대 " + MAX_PHOTOS_PER_STORE + "장까지 등록할 수 있어요."));
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

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "publicUrl", saved.getPublicUrl(),
                "displayOrder", saved.getDisplayOrder()
        ));
    }

    @Operation(summary = "매장 사진 삭제")
    @DeleteMapping("/{photoId}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long storeId, @PathVariable Long photoId) {
        storePhotoRepository.findById(photoId).ifPresent(photo -> {
            if (photo.getStore() == null || !storeId.equals(photo.getStore().getId())) return;
            objectStorage.delete(photo.getStorageKey());
            storePhotoRepository.delete(photo);
        });
        return ResponseEntity.noContent().build();
    }
}
