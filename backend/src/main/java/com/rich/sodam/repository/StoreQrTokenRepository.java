package com.rich.sodam.repository;

import com.rich.sodam.domain.StoreQrToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreQrTokenRepository extends JpaRepository<StoreQrToken, Long> {

    /**
     * QR 에 담긴 토큰 값으로 조회.
     *
     * <p>⚠️ 조회 결과의 {@code store} 가 요청한 storeId 와 같은지는 <b>호출부가 반드시 대조</b>해야 한다 —
     * 토큰만 맞으면 통과시키면 다른 매장의 QR 로 출근이 찍힌다.</p>
     */
    Optional<StoreQrToken> findByToken(String token);

    /** 매장의 현재 활성 토큰들 — 재발급 시 일괄 무효화용(정상 상태에서는 0~1건). */
    List<StoreQrToken> findByStore_IdAndActiveTrue(Long storeId);
}
