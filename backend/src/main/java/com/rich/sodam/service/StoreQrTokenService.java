package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StoreQrToken;
import com.rich.sodam.repository.StoreQrTokenRepository;
import com.rich.sodam.repository.StoreRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 매장 QR 토큰 발급·회전·검증 (WP-C).
 *
 * <p>대리출근 방지가 이 서비스의 존재 이유다. 정적 QR 은 사진 한 장으로 뚫리므로
 * {@link StoreQrToken} 의 회전·만료 설계를 검증 단계에서 실제로 강제한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StoreQrTokenService {

    private final StoreQrTokenRepository qrTokenRepository;
    private final StoreRepository storeRepository;

    /**
     * 매장 QR 재발급 — 이전 활성 토큰을 즉시 무효화하고 새 토큰을 만든다(매장당 활성 1개).
     *
     * <p>QR 이 유출됐다고 판단되면 사장이 이 API 를 눌러 즉시 끊을 수 있어야 한다.
     * 만료를 기다리게 하면 유출 대응이 성립하지 않는다.</p>
     */
    @Transactional
    public StoreQrToken rotate(Long storeId, Duration validity) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다: " + storeId));

        List<StoreQrToken> previous = qrTokenRepository.findByStore_IdAndActiveTrue(storeId);
        previous.forEach(StoreQrToken::revoke);
        qrTokenRepository.saveAll(previous);

        StoreQrToken issued = StoreQrToken.issue(store, LocalDateTime.now(), validity);
        return qrTokenRepository.save(issued);
    }

    /** 현재 활성 토큰(없으면 새로 발급). 사장이 QR 화면을 열 때 사용. */
    @Transactional
    public StoreQrToken currentOrIssue(Long storeId) {
        LocalDateTime now = LocalDateTime.now();
        return qrTokenRepository.findByStore_IdAndActiveTrue(storeId).stream()
                .filter(t -> t.isUsableAt(now))
                .findFirst()
                .orElseGet(() -> rotate(storeId, StoreQrToken.DEFAULT_VALIDITY));
    }

    /**
     * 출퇴근 시 QR 토큰 검증 — 통과하지 못하면 {@link AccessDeniedException}(→ 403).
     *
     * <p>세 가지를 모두 본다:</p>
     * <ol>
     *   <li>토큰이 존재하는가 — 임의 문자열로는 통과할 수 없다.</li>
     *   <li><b>그 토큰이 이 매장 것인가</b> — 다른 매장 QR 로 출근이 찍히는 BOLA 를 막는 핵심 검사다.</li>
     *   <li>활성·유효기간 안인가 — <b>서버 시각</b> 기준. 기기 시계를 믿으면 만료 토큰이 되살아난다.</li>
     * </ol>
     *
     * <p>실패 사유를 응답에 세분화해 알려주지 않는다 — 어떤 토큰이 "존재는 하는지" 알려주면
     * 토큰 탐색의 힌트가 된다. 로그에도 토큰 원문을 남기지 않는다.</p>
     */
    @Transactional(readOnly = true)
    public void verify(Long storeId, String token) {
        if (token == null || token.isBlank()) {
            throw new AccessDeniedException("QR 코드를 다시 스캔해 주세요.");
        }
        StoreQrToken found = qrTokenRepository.findByToken(token).orElse(null);
        if (found == null || !found.getStore().getId().equals(storeId)
                || !found.isUsableAt(LocalDateTime.now())) {
            log.warn("QR 출퇴근 검증 실패 storeId={} (토큰 원문 미기록)", storeId);
            throw new AccessDeniedException("유효하지 않은 QR 코드예요. 매장에 게시된 최신 QR 을 스캔해 주세요.");
        }
    }
}
