package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StoreNfcTag;
import com.rich.sodam.dto.response.StoreNfcTagResponse;
import com.rich.sodam.repository.StoreNfcTagRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 매장 NFC 태그 등록/비활성화/조회. 권한(사장 소유 매장)은 컨트롤러의 StoreAccessGuard 가 담당.
 */
@Service
@RequiredArgsConstructor
public class StoreNfcTagService {

    private final StoreNfcTagRepository tagRepository;
    private final StoreRepository storeRepository;

    /**
     * 매장에 태그 등록. tagId 는 전역 유니크 — 다른 매장에 이미 쓰였거나
     * 같은 매장에 비활성으로 남아있으면 재활성화한다(중복 행 방지).
     */
    @Transactional
    public StoreNfcTagResponse register(Long storeId, String tagId, String label) {
        if (tagId == null || tagId.isBlank()) {
            throw new IllegalArgumentException("태그 식별자(tagId)는 필수예요.");
        }
        return tagRepository.findByTagId(tagId)
                .map(existing -> {
                    if (existing.getStore() == null || !storeId.equals(existing.getStore().getId())) {
                        throw new IllegalArgumentException("이미 다른 매장에 등록된 태그예요.");
                    }
                    existing.activate();
                    if (label != null) {
                        existing.updateLabel(label);
                    }
                    return StoreNfcTagResponse.from(existing);
                })
                .orElseGet(() -> {
                    Store store = storeRepository.findById(storeId)
                            .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요. id=" + storeId));
                    StoreNfcTag saved = tagRepository.save(StoreNfcTag.register(store, tagId, label));
                    return StoreNfcTagResponse.from(saved);
                });
    }

    /** 태그 비활성화(논리 삭제). 출근 검증에서 즉시 차단된다. */
    @Transactional
    public void deactivate(Long storeId, Long tagPk) {
        StoreNfcTag tag = tagRepository.findById(tagPk)
                .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없어요. id=" + tagPk));
        assertBelongsToStore(tag, storeId);
        tag.deactivate();
    }

    /** 태그 재활성화. */
    @Transactional
    public void activate(Long storeId, Long tagPk) {
        StoreNfcTag tag = tagRepository.findById(tagPk)
                .orElseThrow(() -> new IllegalArgumentException("태그를 찾을 수 없어요. id=" + tagPk));
        assertBelongsToStore(tag, storeId);
        tag.activate();
    }

    @Transactional(readOnly = true)
    public List<StoreNfcTagResponse> list(Long storeId) {
        return tagRepository.findByStore_IdOrderByCreatedAtDesc(storeId).stream()
                .map(StoreNfcTagResponse::from)
                .toList();
    }

    /** 경로의 storeId 와 태그의 실제 매장이 일치하는지 — IDOR 2차 방어(컨트롤러 가드와 별개). */
    private void assertBelongsToStore(StoreNfcTag tag, Long storeId) {
        if (tag.getStore() == null || !storeId.equals(tag.getStore().getId())) {
            throw new IllegalArgumentException("해당 매장의 태그가 아니에요.");
        }
    }
}
