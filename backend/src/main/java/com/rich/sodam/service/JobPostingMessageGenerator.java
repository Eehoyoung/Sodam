package com.rich.sodam.service;

import com.rich.sodam.domain.type.JobCategory;
import com.rich.sodam.domain.type.JobWorkType;
import com.rich.sodam.service.ai.AnthropicTextClient;
import com.rich.sodam.service.ai.ForbiddenPhrases;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 채용공고 소개문 생성(WP-4, {@code docs/260817} goal) — 구조화 입력(근무형태·업종·시급·근무시간)만으로
 * 200자 이내 소개문 초안을 만든다. WP-1~3(기존 문구 다듬기)과 달리 처음부터 생성하는 작업이라 되돌아갈
 * "원본"이 없다 — 검증에 실패하면 {@code null}을 반환해 FE가 빈 입력으로 직접 작성하도록 한다(HC-7).
 *
 * <p><b>HC-10 차별 표현 차단</b>: 성별·나이·결혼여부·병역여부를 우대·제한하는 표현(남녀고용평등법·
 * 연령차별금지법)을 차단한다. 이 어휘 리스트는 법무 확인 전까지 보수적으로(의심스러우면 차단)
 * 설계했다 — {@link com.rich.sodam.service.ai.ForbiddenPhrases}(HC-1)와는 별도로 관리한다.</p>
 */
@Slf4j
@Service
public class JobPostingMessageGenerator {

    private static final int MAX_LENGTH = 200;

    /** HC-10: 법무 확인 전까지 보수적으로(의심스러우면 차단) 설계한 차별 표현 어휘. */
    static final List<Pattern> DISCRIMINATORY_PATTERNS = List.of(
            Pattern.compile("여자만|남자만|여성만|남성만"),
            Pattern.compile("여성\\s*우대|남성\\s*우대|여자\\s*우대|남자\\s*우대"),
            Pattern.compile("\\d{1,2}\\s*대\\s*(이하|이상|우대|환영|만)"), // 예: "20대 우대", "30대 이하"
            Pattern.compile("나이\\s*제한"),
            Pattern.compile("미혼\\s*우대|기혼\\s*우대"),
            Pattern.compile("군필\\s*우대|군필자?\\s*환영")
    );

    private final Optional<AnthropicTextClient> client;

    public JobPostingMessageGenerator(Optional<AnthropicTextClient> client) {
        this.client = client;
    }

    /** LLM 미활성/실패/검증 실패는 전부 {@code null} — FE는 이 경우 빈 입력을 유지한다. */
    public String generate(JobWorkType workType, JobCategory category, Integer hourlyWage,
                            LocalTime startTime, LocalTime endTime) {
        if (client.isEmpty() || !client.get().isReady()) {
            return null;
        }
        try {
            String response = client.get().complete(buildPrompt(workType, category, hourlyWage, startTime, endTime));
            if (response == null) {
                return null;
            }
            String draft = response.trim();
            return passesValidation(draft) ? draft : null;
        } catch (Exception e) {
            log.debug("[JobPostingMessageGenerator] 생성 실패 — 빈 입력 유지. cause={}", e.toString());
            return null;
        }
    }

    static String buildPrompt(JobWorkType workType, JobCategory category, Integer hourlyWage,
                               LocalTime startTime, LocalTime endTime) {
        String workTypeLabel = workType == JobWorkType.SUBSTITUTE ? "당일 대타" : "정기 채용";
        return "다음 조건으로 소상공인 채용 공고의 짧은 소개 문구(200자 이내, 한두 문장)를 만들어라. "
                + "성별·나이·결혼여부·병역여부를 우대하거나 제한하는 표현은 절대 쓰지 마라(차별 금지). "
                + "법적 확언(위반이다/막아준다/안전합니다/정확하다 등)을 쓰지 마라.\n\n"
                + "근무형태=" + workTypeLabel + ", 업종=" + category.getDescription() + ", 시급=" + hourlyWage + "원, "
                + "근무시간=" + startTime + "~" + endTime;
    }

    /** HC-1 공용 금지어 + HC-10 차별 표현 + 길이 제약(도메인 필드 200자). */
    static boolean passesValidation(String draft) {
        if (draft == null || draft.isBlank()) {
            return false;
        }
        if (draft.length() > MAX_LENGTH) {
            return false;
        }
        if (ForbiddenPhrases.containsAny(draft)) {
            return false;
        }
        for (Pattern pattern : DISCRIMINATORY_PATTERNS) {
            if (pattern.matcher(draft).find()) {
                return false;
            }
        }
        return true;
    }
}
