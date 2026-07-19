package com.rich.sodam.integration;

import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.domain.PolicyInfo;
import com.rich.sodam.dto.request.LaborInfoRequestDto;
import com.rich.sodam.dto.request.PolicyInfoRequestDto;
import com.rich.sodam.dto.response.LaborInfoResponseDto;
import com.rich.sodam.dto.response.PolicyInfoResponseDto;
import com.rich.sodam.repository.LaborInfoRepository;
import com.rich.sodam.repository.PolicyInfoRepository;
import com.rich.sodam.service.FileUploadService;
import com.rich.sodam.service.LaborInfoService;
import com.rich.sodam.service.PolicyInfoService;
import com.rich.sodam.service.StoreQueryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.when;

/**
 * WP-07 Phase B-2에서 작성, Phase B-5(advisor 기본값 false 전환, 2026-07-19)에서 #1 항목 갱신 —
 * {@code TransactionAspect}(전역 write 트랜잭션 advisor)를 최종적으로 제거하기 전/후에 걸쳐
 * "advisor 없이도 명시적 트랜잭션 선언만으로 동작이 보장된다"를 증명하는 회귀 기준선 테스트다.
 * 실제 Spring 컨테이너 + AOP 프록시를 띄운 상태에서 다음 3가지를 검증한다.
 *
 * <ol>
 *   <li>{@link StoreQueryService}(클래스 레벨 {@code @Transactional(readOnly=true)}) 호출 시
 *       {@link PlatformTransactionManager}를 {@code @SpyBean}으로 감싸
 *       {@code getTransaction(TransactionDefinition)}에 전달된 속성을 캡처한다. B-2 작성 당시
 *       (advisor 기본 켜짐)에는 Spring Boot 자동 어노테이션 advisor와 {@code TransactionAspect}가
 *       이중으로 걸려 readOnly=true 선언이 전역 advisor의 write 트랜잭션에 가려 무력화되는 것을
 *       characterization test로 고정해뒀다(§2.5 참고). B-5에서 advisor 기본값을 false로 바꾼 지금은
 *       이중 advisor가 사라져 명시적 readOnly=true가 실제로 물리 트랜잭션에 반영된다 — 이 항목은
 *       그 정방향 동작을 검증하도록 갱신됐다. 대조군으로 write 서비스
 *       ({@link LaborInfoService#createLaborInfo})는 readOnly=false로 열리는 것도 함께 확인해
 *       캡처 방식 자체가 무의미하게 항상 통과하지 않음을 보장한다.</li>
 *   <li>B-1에서 {@code rollbackFor = Exception.class}를 추가한
 *       {@link LaborInfoService#updateLaborInfo}가 checked exception(IOException)에서도 실제로
 *       DB 롤백되는지 — 이미 영속 엔티티에 필드를 먼저 세팅한 뒤 이미지 업로드 단계에서
 *       예외가 나는 구조를 {@link FileUploadService}를 {@code @MockBean}으로 대체해 재현한다.
 *       advisor 없이도 이 클래스 자체의 명시적 {@code rollbackFor}만으로 롤백이 보장돼야 의미가
 *       있는 항목이라, B-5 전환 이후에도 그대로 유효하다.</li>
 *   <li>{@code @CacheEvict}가 프록시 진입점(빈 외부에서 호출되는 public 메서드)을 통해 호출되면
 *       정상적으로 evict되는지 — {@link PolicyInfoService#updatePolicyInfo}로 검증한다.
 *       이 코드베이스에는(2026-07-19 기준) 같은 클래스 내부에서 캐시 어노테이션이 걸린 자기
 *       메서드를 {@code this.method()}로 호출해 프록시를 우회하는 기존 코드 경로가 없다 —
 *       존재하지 않는 버그를 재현하려고 새 코드를 추가하지 않고, 정방향(프록시 경유) 동작만
 *       검증한다.</li>
 * </ol>
 *
 * <p>클래스 레벨 {@code @Transactional}을 걸지 않는다({@code com.rich.sodam.service.StoreManagerConcurrencyTest}와
 * 동일한 이유) — 롤백 검증(#2)이 실제 DB 커밋/롤백이 아니라 테스트 트랜잭션의 1차 캐시(영속성 컨텍스트)를
 * 관찰하게 되면 거짓 양성이 나올 수 있기 때문이다. 대신 {@code @DirtiesContext}로 이 클래스 전용
 * H2 컨텍스트를 격리한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class TransactionBoundaryTest {

    @Autowired
    private StoreQueryService storeQueryService;

    @Autowired
    private LaborInfoService laborInfoService;

    @Autowired
    private LaborInfoRepository laborInfoRepository;

    @Autowired
    private PolicyInfoService policyInfoService;

    @Autowired
    private PolicyInfoRepository policyInfoRepository;

    @Autowired
    private CacheManager cacheManager;

    /** 실제 물리 트랜잭션 매니저를 감싸 getTransaction()에 전달된 속성을 캡처한다 — 실동작은 그대로 위임(CALLS_REAL_METHODS). */
    @SpyBean
    private PlatformTransactionManager transactionManager;

    /** #2 롤백 검증용 — 이미지 업로드 단계에서 checked exception을 강제로 발생시킨다. */
    @MockBean
    private FileUploadService fileUploadService;

    // ===================== 1) readOnly 속성 검증 =====================

    /**
     * WP-07 B-5 갱신: advisor 기본값이 false로 바뀐 지금은 {@code StoreQueryService}에 걸리는
     * 물리 트랜잭션이 이 클래스의 명시적 {@code @Transactional(readOnly=true)} 하나뿐이다(B-2
     * 작성 당시 발견했던 Spring Boot 자동 advisor와의 이중 적용·readOnly 무력화 문제, §2.5는 이제
     * advisor가 꺼졌으므로 재현되지 않는다). 즉 {@code getTransaction()}이 1회만 호출되고, 그
     * 속성이 실제로 readOnly=true여야 한다 — advisor 제거가 read-only 최적화를 실제로 되살렸다는
     * 직접 증거.
     */
    @Test
    @DisplayName("[advisor-off] StoreQueryService의 readOnly=true 선언이 실제 물리 트랜잭션에 반영된다")
    void storeQueryServiceReadOnlyDeclarationIsHonoredWithoutGlobalAdvisor() {
        clearInvocations(transactionManager);

        storeQueryService.findAllActive();

        ArgumentCaptor<TransactionDefinition> captor = ArgumentCaptor.forClass(TransactionDefinition.class);
        verify(transactionManager, atLeastOnce()).getTransaction(captor.capture());

        assertThat(captor.getAllValues()).isNotEmpty();
        assertThat(captor.getAllValues())
                .as("advisor 없이는 StoreQueryService 호출 경로에서 열린 모든 트랜잭션이 readOnly=true여야 한다")
                .allSatisfy(definition -> assertThat(definition.isReadOnly()).isTrue());
    }

    @Test
    @DisplayName("[대조군] LaborInfoService 쓰기 메서드는 readOnly=false 트랜잭션으로 실행된다")
    void laborInfoServiceWriteMethodRunsUnderWriteTransaction() throws IOException {
        clearInvocations(transactionManager);

        LaborInfoRequestDto dto = new LaborInfoRequestDto();
        dto.setTitle("readOnly 대조군 제목");
        dto.setContent("readOnly 대조군 내용");
        // image 미첨부 — FileUploadService 상호작용 없이 순수 쓰기 트랜잭션 속성만 관찰

        laborInfoService.createLaborInfo(dto);

        ArgumentCaptor<TransactionDefinition> captor = ArgumentCaptor.forClass(TransactionDefinition.class);
        verify(transactionManager, atLeastOnce()).getTransaction(captor.capture());

        assertThat(captor.getAllValues())
                .as("쓰기 서비스 호출 경로에서 열린 트랜잭션 중 최소 하나는 readOnly=false여야 한다"
                        + " (캡처 방식이 항상 true로 무의미하게 통과하지 않음을 보장하는 대조군)")
                .anySatisfy(definition -> assertThat(definition.isReadOnly()).isFalse());
    }

    // ===================== 2) 쓰기 rollback 검증 =====================

    @Test
    @DisplayName("updateLaborInfo 중 IOException 발생 시 이미 세팅된 필드 변경까지 포함해 DB 롤백된다")
    void updateLaborInfoRollsBackDbChangesOnCheckedException() throws Exception {
        LaborInfo original = new LaborInfo();
        original.setTitle("롤백 전 제목");
        original.setContent("롤백 전 내용");
        original.setImagePath("uploads/old-image.jpg");
        Long id = laborInfoRepository.save(original).getId();

        when(fileUploadService.uploadImage(any())).thenThrow(new IOException("강제 업로드 실패 — 롤백 검증용"));

        MockMultipartFile newImage = new MockMultipartFile(
                "image", "new-image.jpg", "image/jpeg", "new image content".getBytes());
        LaborInfoRequestDto dto = new LaborInfoRequestDto();
        dto.setTitle("롤백되어야 할 제목");
        dto.setContent("롤백되어야 할 내용");
        dto.setImage(newImage);

        assertThatThrownBy(() -> laborInfoService.updateLaborInfo(id, dto))
                .isInstanceOf(IOException.class);

        // 새 트랜잭션/영속성 컨텍스트로 다시 조회 — 1차 캐시가 아닌 실제 DB 상태를 확인한다
        LaborInfoResponseDto persisted = laborInfoService.getLaborInfo(id);
        assertThat(persisted.getTitle()).isEqualTo("롤백 전 제목");
        assertThat(persisted.getContent()).isEqualTo("롤백 전 내용");
        assertThat(persisted.getImagePath()).isEqualTo("uploads/old-image.jpg");
    }

    // ===================== 3) self-invocation 프록시 우회 대조 =====================

    @Test
    @DisplayName("프록시 진입점(외부 호출)을 통한 updatePolicyInfo는 캐시를 정상적으로 evict한다")
    void policyInfoCacheEvictsThroughProxyEntryPoint() throws IOException {
        PolicyInfo entity = new PolicyInfo();
        entity.setTitle("evict 대상 제목");
        entity.setContent("evict 대상 내용");
        Long id = policyInfoRepository.save(entity).getId();

        // 프록시 경유 호출 — @Cacheable 진입점 (PolicyInfoService는 외부 빈이므로 이 호출 자체가 이미 프록시를 거친다)
        PolicyInfoResponseDto cached = policyInfoService.getPolicyInfo(id);
        assertThat(cached.getTitle()).isEqualTo("evict 대상 제목");

        Cache policyCache = cacheManager.getCache("policyInfo");
        assertThat(policyCache).isNotNull();
        assertThat(policyCache.get(id)).as("조회 직후 캐시에 채워져 있어야 한다").isNotNull();

        // 프록시 경유 호출 — @Caching(evict=...) 진입점
        PolicyInfoRequestDto updateDto = new PolicyInfoRequestDto();
        updateDto.setTitle("evict 후 제목");
        updateDto.setContent("evict 후 내용");
        policyInfoService.updatePolicyInfo(id, updateDto);

        assertThat(policyCache.get(id))
                .as("프록시를 통한 evict 호출 직후에는 캐시 엔트리가 비어 있어야 한다")
                .isNull();

        // 재조회 시 최신 값(스테일 캐시가 아님)이 나와야 evict가 실제로 먹혔다는 증거가 된다
        PolicyInfoResponseDto refreshed = policyInfoService.getPolicyInfo(id);
        assertThat(refreshed.getTitle()).isEqualTo("evict 후 제목");
    }
}
