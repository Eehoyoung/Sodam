package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-4 — 퇴사 확인서 PDF 텍스트 내용 검증(HC-10, HC-11). PDF 바이너리가 아니라
 * {@link EmployeeResignationPdfService#contentLines}가 노출하는 순수 텍스트를 대상으로 한다.
 */
class EmployeeResignationPdfServiceTest {

    private EmployeeResignationRequest request(LocalDate agreedDate) {
        User employee = new User("pdf_emp@x.com", "김직원");
        employee.setUserGrade(UserGrade.EMPLOYEE);
        EmployeeProfile profile = new EmployeeProfile(employee);
        Store store = new Store("PDF테스트매장", "1234567890", "02-000-0000", "카페", 10_000, 100);
        EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store, 12_000);
        EmployeeResignationRequest r = EmployeeResignationRequest.create(
                relation, employee, LocalDate.now().plusDays(14), "사유");
        if (agreedDate != null) {
            r.agreeOn(agreedDate);
        }
        return r;
    }

    @Test
    @DisplayName("PDF 생성이 실제로 정상 동작한다(비어있지 않은 바이트 배열)")
    void generatesNonEmptyPdf() {
        EmployeeResignationRequest r = request(LocalDate.now().plusDays(21));
        Store store = new Store("PDF테스트매장", "1234567890", "02-000-0000", "카페", 10_000, 100);
        byte[] pdf = new EmployeeResignationPdfService().generate(r, store, r.getRequester());

        assertThat(pdf).isNotEmpty();
        assertThat(pdf.length).isGreaterThan(100); // 유효한 PDF는 헤더만으로도 이 정도는 넘는다
    }

    @Test
    @DisplayName("HC-10: 면책 문구('정산 금액·지급 시기를 확정하지 않습니다')가 반드시 포함된다")
    void containsDisclaimer() {
        List<String> lines = EmployeeResignationPdfService.contentLines(
                request(LocalDate.now().plusDays(21)), null, null);

        assertThat(lines).anySatisfy(line -> assertThat(line).contains("정산 금액·지급 시기를 확정하지 않습니다"));
    }

    @Test
    @DisplayName("HC-10: 근로기준법 제36조(14일 금품 청산) 조문이 그대로 인용된다")
    void containsLawCitation() {
        List<String> lines = EmployeeResignationPdfService.contentLines(
                request(LocalDate.now().plusDays(21)), null, null);

        assertThat(lines).anySatisfy(line -> {
            assertThat(line).contains("근로기준법 제36조");
            assertThat(line).contains("14일 이내");
        });
    }

    @Test
    @DisplayName("HC-10: 급여·정산 금액 관련 확정 문구가 없다(최종정산액·공제·실수령액 등)")
    void doesNotContainPayrollAmountLanguage() {
        List<String> lines = EmployeeResignationPdfService.contentLines(
                request(LocalDate.now().plusDays(21)), null, null);
        String joined = String.join("\n", lines);

        assertThat(joined).doesNotContain("최종정산액", "공제 후", "실수령액", "지급액은", "정산금액은");
    }

    @Test
    @DisplayName("HC-11: '다음날부터' 등 노무 개념을 확정하는 표현이 없다 — '합의된 마지막 근무일'만 사용")
    void doesNotAssertContestedLaborConcepts() {
        List<String> lines = EmployeeResignationPdfService.contentLines(
                request(LocalDate.now().plusDays(21)), null, null);
        String joined = String.join("\n", lines);

        assertThat(joined).doesNotContain("다음날부터", "상실됩니다", "확정됩니다");
        assertThat(joined).contains("합의된 마지막 근무일");
    }

    @Test
    @DisplayName("HC-1 공용 금지어(위반입니다·안전합니다 등)도 섞이지 않는다")
    void doesNotContainForbiddenLegalAssertions() {
        List<String> lines = EmployeeResignationPdfService.contentLines(
                request(LocalDate.now().plusDays(21)), null, null);
        String joined = String.join("\n", lines);

        assertThat(joined).doesNotContain("위반입니다", "막아드립니다", "정확하게 계산", "법적 자문", "안전합니다");
    }
}
