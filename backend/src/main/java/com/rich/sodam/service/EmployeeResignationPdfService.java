package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * 퇴사 확인서 PDF 생성(260817 퇴사 처리 기능 계획서 WP-4).
 *
 * <p><b>내용 범위는 좁게 고정한다(HC-10)</b>: "퇴사 사실 + 합의된 마지막 근무일 확인" +
 * 근로기준법 §36(14일 이내 금품 청산) 조문 인용 안내 + 정산 미확정 면책 문구뿐이다. 최종 정산
 * 금액·급여 확정·공제 내역은 절대 넣지 않는다 — 넣는 순간 G-8(3.3% 실질과세)·G-11(세무 증빙
 * 발급)과 얽힌다. {@link #contentLines}가 실제 텍스트 내용을 PDF 렌더링과 분리해 노출하는
 * 이유도 이 경계를 골든 텍스트 테스트로 고정하기 위함이다.</p>
 *
 * <p><b>문구는 가안(假案)이다</b> — [[L-3]](노무 문구·근로계약서 법적 검토 미완료)·[[C-6]]
 * (퇴사 확인서 서명 문구 확정 대기) 대상. 노무사·법무 검토 후 문구를 교체할 것.</p>
 *
 * <p><b>노무 개념 확정 표현 금지(HC-11)</b>: "퇴직일=마지막 근무일 다음날" 같은 통념은
 * 고용보험 자격상실일 산정이라는 좁은 국면에서만 명문 근거가 있고 그 밖에서는 해석이 갈린다
 * (계획서 §1-A). "합의된 마지막 근무일"이라는 중립 표현만 쓴다.</p>
 */
@Service
public class EmployeeResignationPdfService {

    static final String DISCLAIMER =
            "※ 이 확인서는 정산 금액·지급 시기를 확정하지 않습니다. 최종 정산은 별도 절차로 진행됩니다.";

    static final String LAW_CITATION =
            "근로기준법 제36조(금품 청산): 사용자는 근로자가 퇴직한 경우 그 지급 사유가 발생한 때부터 "
                    + "14일 이내에 임금, 보상금, 그 밖의 모든 금품을 지급하여야 한다. 다만 특별한 사정이 "
                    + "있을 경우에는 당사자 사이의 합의에 의하여 기일을 연장할 수 있다.";

    /** PDF 렌더링과 분리된 순수 텍스트 내용 — HC-10 골든 텍스트 테스트 대상. */
    static List<String> contentLines(EmployeeResignationRequest request, Store store, User employee) {
        String storeName = store != null ? nvl(store.getStoreName()) : "-";
        String employeeName = employee != null ? nvl(employee.getName()) : "-";
        String agreedDate = request.getAgreedResignationDate() != null
                ? request.getAgreedResignationDate().toString() : "-";
        return List.of(
                "퇴 사 확 인 서",
                String.format("%s(이하 \"사업주\")과(와) %s(이하 \"근로자\")은 합의된 마지막 근무일을 기준으로 "
                        + "근로관계를 종료하기로 확인한다.", storeName, employeeName),
                "합의된 마지막 근무일: " + agreedDate,
                LAW_CITATION,
                DISCLAIMER);
    }

    public byte[] generate(EmployeeResignationRequest request, Store store, User employee) {
        List<String> lines = contentLines(request, store, employee);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4, 40, 40, 40, 40);
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);

            com.lowagie.text.pdf.BaseFont bf;
            try {
                bf = com.lowagie.text.pdf.BaseFont.createFont(
                        "HYSMyeongJoStd-Medium", "UniKS-UCS2-H",
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception ignored) {
                bf = com.lowagie.text.pdf.BaseFont.createFont();
            }
            com.lowagie.text.Font fontTitle = new com.lowagie.text.Font(bf, 18, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font fontN = new com.lowagie.text.Font(bf, 10);
            com.lowagie.text.Font fontDisclaimer = new com.lowagie.text.Font(bf, 9, com.lowagie.text.Font.ITALIC);

            document.open();

            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph(lines.get(0), fontTitle);
            title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(title);
            document.add(new com.lowagie.text.Paragraph(" ", fontN));

            document.add(new com.lowagie.text.Paragraph(lines.get(1), fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(lines.get(2), fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(lines.get(3), fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(lines.get(4), fontDisclaimer));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("퇴사 확인서 PDF 생성에 실패했습니다.", e);
        }
    }

    private static String nvl(String s) {
        return s == null || s.isBlank() ? "-" : s;
    }
}
