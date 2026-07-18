package com.rich.sodam.controller;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.dto.MasterMyPageResponseDto;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.MasterProfileService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.TimeOffService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * /api/master/mypage 매장 목록 중복 조회 회귀 테스트.
 *
 * 과거 MasterController#getMasterMyPage 가 MasterProfileService#getStoresByMaster 를 직접 호출한 뒤,
 * 곧이어 호출하는 getCombinedStats 내부에서 동일 메서드를 다시 호출해
 * MasterStoreRelationRepository#findByMasterProfile 이 같은 요청 안에서 2회 실행되던 문제(query_measurement.md §2)의
 * 회귀 방지 테스트. getCombinedStats(masterId, stores) 오버로드로 이미 조회한 매장 목록을 재사용해야 한다.
 */
@ExtendWith(MockitoExtension.class)
class MasterControllerTest {

    @Mock
    MasterProfileRepository masterProfileRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    MasterStoreRelationRepository masterStoreRelationRepository;
    @Mock
    StoreRepository storeRepository;
    @Mock
    TimeOffService timeOffService;
    @Mock
    EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Mock
    PayrollRepository payrollRepository;
    @Mock
    StoreAccessGuard guard;

    private final UserPrincipal principal = new UserPrincipal(1L, "owner@sodam.dev", List.of());

    @Test
    @DisplayName("사장 마이페이지 조회 시 매장 목록 조회 리포지토리 메서드가 정확히 1회만 호출된다(중복 쿼리 회귀 방지)")
    void getMasterMyPage_fetchesStoreListOnlyOnce() {
        Long masterId = 1L;

        com.rich.sodam.domain.User user = mock(com.rich.sodam.domain.User.class);
        when(user.getName()).thenReturn("사장");
        when(user.getEmail()).thenReturn("owner@sodam.dev");

        MasterProfile masterProfile = mock(MasterProfile.class);
        when(masterProfile.getBusinessLicenseNumber()).thenReturn("123-45-67890");
        when(masterProfile.getUser()).thenReturn(user);

        Store store1 = mock(Store.class);
        when(store1.getId()).thenReturn(10L);
        Store store2 = mock(Store.class);
        when(store2.getId()).thenReturn(20L);

        MasterStoreRelation relation1 = new MasterStoreRelation(masterProfile, store1);
        MasterStoreRelation relation2 = new MasterStoreRelation(masterProfile, store2);

        when(masterProfileRepository.findById(masterId)).thenReturn(Optional.of(masterProfile));
        when(masterStoreRelationRepository.findByMasterProfile(masterProfile))
                .thenReturn(List.of(relation1, relation2));
        when(employeeStoreRelationRepository.countByStoreAndIsActiveTrue(any(Store.class))).thenReturn(0L);
        when(payrollRepository.findByStoreIdAndPeriod(any(), any(), any())).thenReturn(List.of());
        when(timeOffService.countPendingTimeOffsByMaster(masterId)).thenReturn(0);
        when(timeOffService.getPendingTimeOffsByMaster(masterId)).thenReturn(List.<TimeOff>of());

        MasterProfileService masterProfileService = new MasterProfileService(
                masterProfileRepository,
                userRepository,
                masterStoreRelationRepository,
                storeRepository,
                timeOffService,
                employeeStoreRelationRepository,
                payrollRepository);

        MasterController controller = new MasterController(masterProfileService, timeOffService, guard);

        ResponseEntity<MasterMyPageResponseDto> response = controller.getMasterMyPage(principal);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStores()).hasSize(2);
        assertThat(response.getBody().getCombinedStats().getTotalStores()).isEqualTo(2);

        // 핵심 회귀 검증: 매장 목록 조회 쿼리(findByMasterProfile)가 요청당 정확히 1회만 실행돼야 한다.
        verify(masterStoreRelationRepository, times(1)).findByMasterProfile(masterProfile);
    }
}
