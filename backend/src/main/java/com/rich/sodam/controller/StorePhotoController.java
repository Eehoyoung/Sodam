package com.rich.sodam.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.StorePhotoService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/photos")
@RequiredArgsConstructor
@Tag(name = "매장 사진", description = "매장 사진 업로드/삭제/조회")
public class StorePhotoController {

    private final StorePhotoService storePhotoService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "매장 사진 목록")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId); // BOLA 차단: 본인 매장만
        return ResponseEntity.ok(storePhotoService.list(storeId));
    }

    @Operation(summary = "매장 사진 업로드",
            description = "한 번에 1장. JPG/PNG. 최대 5MB. 매장당 최대 5장.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam("file") MultipartFile file) throws IOException {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId); // BOLA 차단: 본인 매장만
        StorePhotoService.UploadResult result = storePhotoService.upload(storeId, file);
        if (!result.success()) {
            return ResponseEntity.badRequest().body(Map.of("message", result.message()));
        }
        return ResponseEntity.ok(result.body());
    }

    @Operation(summary = "매장 사진 삭제")
    @DeleteMapping("/{photoId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId, @PathVariable Long photoId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId); // BOLA 차단: 본인 매장만
        storePhotoService.delete(storeId, photoId);
        return ResponseEntity.noContent().build();
    }
}
