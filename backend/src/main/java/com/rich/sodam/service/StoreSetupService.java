package com.rich.sodam.service;

import com.rich.sodam.domain.OperatingHours;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.StoreSetupResponse;
import com.rich.sodam.dto.response.StoreSetupResponse.SetupItem;
import com.rich.sodam.repository.StoreRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 매장 설정 완성도 + 다음 한 가지 액션 (GR-NEW-06).
 *
 * <p>설정 미완으로 방치되는 유령매장을 줄이기 위한 activation 레버. 핵심 설정 항목별 완료 여부를
 * 계산해 완성도 %를 내려주고, 미완 첫 항목을 "지금 할 한 가지"로 제시한다. 사장 전용.
 *
 * <p>항목 순서가 곧 우선순위다(다음 액션은 미완 첫 항목). 매장정보 → 기준시급 → 운영시간 → 위치/반경
 * → 직원 등록 순으로, 출퇴근·급여가 동작하기까지 필요한 순서로 배치했다.
 */
@Service
@RequiredArgsConstructor
public class StoreSetupService {

    static final String KEY_STORE_INFO = "STORE_INFO";
    static final String KEY_WAGE = "WAGE";
    static final String KEY_OPERATING_HOURS = "OPERATING_HOURS";
    static final String KEY_LOCATION = "LOCATION";
    static final String KEY_EMPLOYEE = "EMPLOYEE";

    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public StoreSetupResponse completeness(Long storeId) {
        Store store = storeRepository.findActiveById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없어요. id=" + storeId));

        int employeeCount = storeRepository.countActiveEmployeesByStoreId(storeId);

        List<SetupItem> items = new ArrayList<>();
        items.add(new SetupItem(KEY_STORE_INFO, "매장 기본정보", hasStoreInfo(store)));
        items.add(new SetupItem(KEY_WAGE, "기준 시급", hasWage(store)));
        items.add(new SetupItem(KEY_OPERATING_HOURS, "운영시간", hasOperatingHours(store)));
        items.add(new SetupItem(KEY_LOCATION, "위치·반경", hasLocation(store)));
        items.add(new SetupItem(KEY_EMPLOYEE, "직원 1명 이상", employeeCount > 0));

        long doneCount = items.stream().filter(SetupItem::done).count();
        int completionRate = (int) Math.round(doneCount * 100.0 / items.size());

        SetupItem next = items.stream().filter(item -> !item.done()).findFirst().orElse(null);
        String nextActionKey = next == null ? null : next.key();
        String nextActionLabel = next == null ? null : next.label();

        return new StoreSetupResponse(storeId, completionRate, items, nextActionKey, nextActionLabel);
    }

    /** 매장명·전화·업종 모두 입력되었는지. 등록 시 필수라 보통 완료지만 방어적으로 확인. */
    private boolean hasStoreInfo(Store store) {
        return hasText(store.getStoreName())
                && hasText(store.getStorePhoneNumber())
                && hasText(store.getBusinessType());
    }

    private boolean hasWage(Store store) {
        Integer wage = store.getStoreStandardHourWage();
        return wage != null && wage > 0;
    }

    /** 운영시간이 한 요일이라도 영업으로 설정되어 있는지(전 요일 휴무·미설정이면 미완). */
    private boolean hasOperatingHours(Store store) {
        OperatingHours hours = store.getOperatingHours();
        if (hours == null) {
            return false;
        }
        for (java.time.DayOfWeek day : java.time.DayOfWeek.values()) {
            if (hours.isOpenOn(day) && hours.getOpenTime(day) != null && hours.getCloseTime(day) != null) {
                return true;
            }
        }
        return false;
    }

    private boolean hasLocation(Store store) {
        return store.hasLocationSet() && store.getRadius() != null && store.getRadius() > 0;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
