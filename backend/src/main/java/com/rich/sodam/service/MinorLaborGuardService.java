package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinorLaborStandards;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.response.MinorGuardResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import org.springframework.beans.factory.annotation.Value;

/**
 * 연소근로자(만 18세 미만) 가드 (L-NEW-01). 사장 보호 기능.
 *
 * <p>직원의 생년월일로 미성년 여부·만 나이·근로 제약을 산정해 안내한다. 청소년 알바 고용 시
 * 야간·과한 근로는 형사처벌 영역이므로 사장이 미리 확인하도록 돕는다.
 *
 * <p><b>친권자 동의서·가족관계증명서 원본은 저장하지 않는다</b>(PII Hard No, 프로젝트 운영 기준 §절대금지2).
 * {@code consentRequired} 플래그·안내 문구까지만 제공한다.
 */
@Service
@RequiredArgsConstructor
public class MinorLaborGuardService {

    static final String DISCLAIMER =
            "근로기준법 안내(참고용)예요. 인가·동의 절차와 실제 적용은 노무사·관할 고용센터 확인이 필요해요.";

    private static final String GUIDANCE_MINOR =
            "이 직원은 연소근로자(만 18세 미만)예요. 1일 7시간·1주 35시간을 넘기지 않도록 근무를 짜 주세요. "
                    + "밤 10시~새벽 6시 야간근로와 휴일근로는 원칙적으로 금지이고, 시키려면 고용노동부 인가와 본인 동의가 필요해요. "
                    + "또한 친권자(또는 후견인) 동의서와 가족관계증명서를 매장에 비치해야 해요(근로기준법 §66).";

    private static final String GUIDANCE_NOT_MINOR =
            "이 직원은 만 18세 이상이라 연소근로자 보호 규정은 해당되지 않아요.";

    private static final String GUIDANCE_UNKNOWN =
            "직원의 생년월일이 등록되어 있지 않아 연소근로자 여부를 확인할 수 없어요. "
                    + "만 18세 미만일 수 있으니 생년월일을 먼저 확인해 주세요.";

    private final EmployeeProfileRepository employeeProfileRepository;
    @Value("${sodam.features.guardian-consent-enabled:false}")
    private boolean guardianConsentEnabled;

    /**
     * 만 18세 미만(연소자) 여부 판정. birthDate 가 null 이면 false(불명).
     *
     * @param birthDate 생년월일
     * @param asOf      기준일(보통 오늘)
     */
    public boolean isMinor(LocalDate birthDate, LocalDate asOf) {
        if (birthDate == null || asOf == null) {
            return false;
        }
        return ageAt(birthDate, asOf) < MinorLaborStandards.MINOR_AGE_THRESHOLD;
    }

    /**
     * 직원의 연소근로자 가드 평가. 매장 소유 검증은 컨트롤러(StoreAccessGuard)에서 선행.
     */
    @Transactional(readOnly = true)
    public MinorGuardResponse evaluate(Long employeeId, Long storeId) {
        EmployeeProfile profile = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("직원을 찾을 수 없어요: " + employeeId));

        LocalDate birthDate = userBirthDate(profile);
        LocalDate today = LocalDate.now();

        if (birthDate == null) {
            // birthDate 없으면 unknown — 미성년 단정 불가, 안내만.
            return new MinorGuardResponse(
                    employeeId, false, null,
                    MinorLaborStandards.DAILY_HOUR_LIMIT, MinorLaborStandards.WEEKLY_HOUR_LIMIT,
                    false, false, false,
                    "가족관계증명서와 동의서 원본은 앱에 업로드하거나 저장하지 않습니다.",
                    GUIDANCE_UNKNOWN, DISCLAIMER);
        }

        int age = ageAt(birthDate, today);
        boolean minor = age < MinorLaborStandards.MINOR_AGE_THRESHOLD;

        // TODO[승인]: 친권자 동의서 PII 수집·저장은 법무 승인 후. 현재는 필요 플래그·안내만.
        return new MinorGuardResponse(
                employeeId,
                minor,
                age,
                MinorLaborStandards.DAILY_HOUR_LIMIT,
                MinorLaborStandards.WEEKLY_HOUR_LIMIT,
                minor,   // 미성년이면 야간/휴일근로 제한
                minor,   // 미성년이면 친권자 동의서·가족관계증명서 비치 필요
                minor && guardianConsentEnabled,
                "가족관계증명서는 사업주가 별도 비치하며 앱에 업로드하거나 저장하지 않습니다.",
                minor ? GUIDANCE_MINOR : GUIDANCE_NOT_MINOR,
                DISCLAIMER);
    }

    private LocalDate userBirthDate(EmployeeProfile profile) {
        User user = profile.getUser();
        return user == null ? null : user.getBirthDate();
    }

    private int ageAt(LocalDate birthDate, LocalDate asOf) {
        return Period.between(birthDate, asOf).getYears();
    }
}
