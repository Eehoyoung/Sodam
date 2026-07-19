package com.rich.sodam.integration;

import com.rich.sodam.core.electronicsignature.DocumentDigest;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.core.electronicsignature.SensitiveReferenceCrypto;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.*;
import com.rich.sodam.repository.*;
import com.rich.sodam.service.ElectronicSignatureWorker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * WP-07 Phase B-4 — {@code ElectronicSignatureWorker.runDueWork()}의 항목별 독립 트랜잭션
 * 설계가 전역 {@code TransactionAspect} advisor에 의해 깨지지 않는지 검증한다.
 *
 * <p><b>실제 Spring 빈 경유 필수</b>: {@code @Autowired}로 주입받은 {@link ElectronicSignatureWorker}는
 * component-scan + AOP 프록시를 거친 진짜 빈이다 — {@code ElectronicSignatureWorkerPersistenceTest}처럼
 * {@code new}로 직접 생성하면 advisor 프록시 자체를 우회해 이 문제를 재현/검증할 수 없다.</p>
 *
 * <p><b>재현 이력(수정 전 상태, 참고용)</b>: 수정 전에는 {@code transactions} 필드의
 * {@link org.springframework.transaction.support.TransactionTemplate}가 기본 전파
 * ({@code PROPAGATION_REQUIRED})였다. 애초 가설 문서는 "게이트웨이 호출이 예외를 던지면
 * 재현된다"를 전제했지만, 실제 코드를 추적해 보면 {@code processRequest}/{@code processStatus}/
 * {@code processVerify}에서 {@code gateway.request()/getStatus()/verify()} 호출은
 * {@code transactions.execute(...)} 콜백 "밖"의 평문 호출이라 그 예외는 TransactionTemplate의
 * 자체 rollback-only 마킹을 전혀 거치지 않는다(직접 실행해 확인함 — 재현되지 않았다). 반면
 * {@code prepareRequest}(예: 중복 idempotency key 방어 로직)가 던지는 예외는
 * {@code transactions.execute(status -> prepareRequest(work))} 콜백 "안"에서 발생해 실제로
 * rollback-only 마킹을 태웠다 — 그 트리거로 이 테스트를 처음 작성했을 때는 A 항목의 실패가
 * 같은 물리 트랜잭션에 참여 중이던 B 항목의 성공까지 통째로 롤백시키고
 * {@code UnexpectedRollbackException}을 던지는 것을 실제로 확인했다(수정 전 원본 코드 기준).
 * {@code transactions} 필드를 생성자에서 {@code PROPAGATION_REQUIRES_NEW}로 강제한 지금은
 * 이 테스트가 "더 이상 그렇게 되지 않는다"를 검증하는 회귀 테스트로 남는다.</p>
 */
@SpringBootTest(properties = {
        "sodam.integration.electronic-signature.worker-enabled=true"
})
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ElectronicSignatureWorkerTransactionIsolationTest {

    @Autowired
    private ElectronicSignatureWorker worker;

    @Autowired
    private ElectronicSignatureEnvelopeRepository envelopeRepository;

    @Autowired
    private ElectronicSignaturePartyRepository partyRepository;

    @Autowired
    private ElectronicSignatureOutboxRepository outboxRepository;

    @Autowired
    private ElectronicSignatureAttemptRepository attemptRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SensitiveReferenceCrypto crypto;

    @Test
    @DisplayName("[수정 후] 한 사이클에서 A 항목의 실패가 같은 사이클의 B 항목 성공 처리를 함께 롤백시키지 않는다")
    void oneItemFailureInsideTransactionsExecuteDoesNotRollBackAnotherItemsSuccessInSameCycle() {
        User signerA = createSigner("esign-worker-tx-a@example.test", "01011110001");
        User signerB = createSigner("esign-worker-tx-b@example.test", "01011110002");

        ElectronicSignatureEnvelope envelopeA = createEnvelope(signerA, 910L);
        ElectronicSignatureEnvelope envelopeB = createEnvelope(signerB, 911L);

        ElectronicSignatureParty partyA = queueRequestParty(envelopeA, signerA);
        ElectronicSignatureParty partyB = queueRequestParty(envelopeB, signerB);

        // A: prepareRequest()가 던지는 "이미 시작된 서명 요청" 예외를 강제한다 — 이 예외는
        // transactions.execute(status -> prepareRequest(work)) 콜백 "안"에서 발생해 실제로
        // rollback-only 마킹을 태우는 경로다.
        String idempotencyKeyA = "request:" + partyA.getId();
        attemptRepository.saveAndFlush(ElectronicSignatureAttempt.started(
                partyA.getId(), SignatureOperation.REQUEST, idempotencyKeyA));
        ElectronicSignatureOutbox outboxA = outboxRepository.saveAndFlush(ElectronicSignatureOutbox.queue(
                envelopeA.getId(), partyA.getId(), SignatureOperation.REQUEST,
                idempotencyKeyA, LocalDateTime.now().minusSeconds(10)));

        // B: 정상 처리 — 실제(mock 모드) 게이트웨이를 그대로 태워 성공시킨다.
        String idempotencyKeyB = "request:" + partyB.getId();
        ElectronicSignatureOutbox outboxB = outboxRepository.saveAndFlush(ElectronicSignatureOutbox.queue(
                envelopeB.getId(), partyB.getId(), SignatureOperation.REQUEST,
                idempotencyKeyB, LocalDateTime.now().minusSeconds(9)));

        assertThatCode(worker::runDueWork)
                .as("PROPAGATION_REQUIRES_NEW로 항목별 물리 트랜잭션이 분리되면 advisor의 외부"
                        + " 트랜잭션이 rollback-only로 오염되지 않아야 하고, 예외도 던져지지 않아야 한다")
                .doesNotThrowAnyException();

        // 새로 조회 — 같은 트랜잭션의 1차 캐시가 아니라 실제 DB에 커밋된 상태를 확인한다.
        ElectronicSignatureOutbox reloadedOutboxA = outboxRepository.findById(outboxA.getId()).orElseThrow();
        ElectronicSignatureOutbox reloadedOutboxB = outboxRepository.findById(outboxB.getId()).orElseThrow();
        ElectronicSignatureParty reloadedPartyA = partyRepository.findById(partyA.getId()).orElseThrow();
        ElectronicSignatureParty reloadedPartyB = partyRepository.findById(partyB.getId()).orElseThrow();

        assertThat(reloadedOutboxA.getStatus())
                .as("A는 예외로 실패했으므로 dead-letter 처리되어 커밋됐어야 한다"
                        + " — 자기 자신의 실패는 여전히 정상적으로 반영된다")
                .isEqualTo(SignatureOutboxStatus.DEAD_LETTER);
        assertThat(reloadedPartyA.getStatus()).isEqualTo(SignaturePartyStatus.MANUAL_REISSUE_REQUIRED);

        assertThat(reloadedOutboxB.getStatus())
                .as("B는 A의 실패와 무관하게 독립적으로 정상 커밋되어 COMPLETED여야 한다"
                        + " — 항목별 독립 트랜잭션 설계가 실제로 보장된다는 직접 증거")
                .isEqualTo(SignatureOutboxStatus.COMPLETED);
        assertThat(reloadedPartyB.getStatus())
                .as("B는 요청이 정상 완료되어 PENDING(공급자 응답 대기)으로 전이돼야 한다")
                .isEqualTo(SignaturePartyStatus.PENDING);

        assertThat(attemptRepository.existsByIdempotencyKey(idempotencyKeyB))
                .as("B 처리 중 남긴 attempt 기록도 독립적으로 커밋되어 존재해야 한다")
                .isTrue();
    }

    private User createSigner(String email, String phone) {
        User user = new User(email, "재현테스트서명자");
        user.setUserGrade(UserGrade.EMPLOYEE);
        user.setPhone(phone);
        user.setBirthDate(LocalDate.of(1991, 3, 4));
        return userRepository.saveAndFlush(user);
    }

    private ElectronicSignatureEnvelope createEnvelope(User signer, long subjectId) {
        byte[] pdf = ("%PDF-worker-tx-" + subjectId).getBytes(StandardCharsets.UTF_8);
        ElectronicSignatureEnvelope envelope = envelopeRepository.saveAndFlush(ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, subjectId, 700L, 1,
                DocumentDigest.sha256(pdf).hex(), crypto.encrypt("unsigned/worker-tx-" + subjectId), signer.getId()));
        // saveAndFlush() 결과는 이 테스트에 클래스 레벨 @Transactional이 없어 detach된다 — mutation을
        // 다시 저장해야 DB에 반영된다.
        envelope.markInProgress();
        return envelopeRepository.saveAndFlush(envelope);
    }

    private ElectronicSignatureParty queueRequestParty(ElectronicSignatureEnvelope envelope, User signer) {
        // saveAndFlush()가 반환하는 엔티티는 (이 테스트에 클래스 레벨 @Transactional이 없어) 호출이
        // 끝나는 순간 detach된다 — 이후 queueRequest() mutation은 다시 저장해야 DB에 반영된다.
        ElectronicSignatureParty party = partyRepository.saveAndFlush(ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.OWNER, signer.getId(), 1, ElectronicSignatureProvider.NAVER));
        party.queueRequest();
        return partyRepository.saveAndFlush(party);
    }
}
