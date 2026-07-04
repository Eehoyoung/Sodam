package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.CertificateType;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 재직/경력증명서 PDF 발급 — 직원 본인이 자기 증명서를 다운로드한다.
 *
 * <p>급여명세서 PDF 파이프라인({@link PayrollService#generatePayrollPdf})과 동일하게
 * OpenPDF 로 바이트 배열을 생성해 반환한다.
 * <p><b>보안</b>: 해당 매장 소속(현재 또는 과거)이 아닌 사용자는 403.
 * 주민등록번호는 절대 포함하지 않는다(프로젝트 원칙: 주민번호 미저장).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CertificateService {

    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;

    /**
     * 증명서 PDF 생성.
     *
     * @param userId  로그인 사용자 id (EmployeeProfile.id == User.id)
     * @param storeId 대상 매장 id
     * @param type    EMPLOYMENT(재직) / CAREER(경력)
     * @throws AccessDeniedException    해당 매장 소속(현재/과거)이 아닌 경우 (→ 403)
     * @throws IllegalArgumentException 퇴사자가 재직증명서를 요청한 경우 (→ 400)
     */
    @Transactional(readOnly = true)
    public byte[] generate(Long userId, Long storeId, CertificateType type) {
        if (type == null) {
            throw new IllegalArgumentException("증명서 종류(EMPLOYMENT/CAREER)를 선택해 주세요.");
        }
        // 현재 + 과거 소속 모두 허용 — isActive 필터 없이 관계 존재 여부로 판정 (BOLA 차단)
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfile_IdAndStore_Id(userId, storeId)
                .orElseThrow(() -> {
                    log.warn("권한 거부: user {} 가 store {} 증명서 발급 시도 (미소속)", userId, storeId);
                    return new AccessDeniedException("해당 매장 소속 이력이 없어 증명서를 발급할 수 없어요.");
                });

        boolean active = Boolean.TRUE.equals(relation.getIsActive());
        if (type == CertificateType.EMPLOYMENT && !active) {
            throw new IllegalArgumentException("퇴사한 매장의 재직증명서는 발급할 수 없어요. 경력증명서를 이용해 주세요.");
        }
        return renderPdf(relation, type, active);
    }

    /** OpenPDF 로 증명서 렌더링 (급여명세서 PDF 와 동일 파이프라인). */
    private byte[] renderPdf(EmployeeStoreRelation relation, CertificateType type, boolean active) {
        Store store = relation.getStore();
        String employeeName = relation.getEmployeeProfile() != null
                && relation.getEmployeeProfile().getUser() != null
                ? relation.getEmployeeProfile().getUser().getName() : "-";
        LocalDate hireDate = relation.getHireDate();
        LocalDate today = LocalDate.now();

        String title = type == CertificateType.EMPLOYMENT ? "재 직 증 명 서" : "경 력 증 명 서";
        String periodText = buildPeriodText(hireDate, active);
        String statement = type == CertificateType.EMPLOYMENT
                ? "위 사람은 당 사업장에 재직 중임을 증명합니다."
                : "위 사람은 당 사업장에서 위 기간 동안 근무하였음을 증명합니다.";

        try (java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4);
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);

            // 한글 지원 폰트 — 시스템 폰트 fallback (운영에서는 NanumGothic.ttf 번들 권장)
            com.lowagie.text.pdf.BaseFont bf;
            try {
                bf = com.lowagie.text.pdf.BaseFont.createFont(
                        "HYSMyeongJoStd-Medium", "UniKS-UCS2-H",
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception ignored) {
                bf = com.lowagie.text.pdf.BaseFont.createFont();
            }
            com.lowagie.text.Font fontTitle = new com.lowagie.text.Font(bf, 20, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font fontH = new com.lowagie.text.Font(bf, 12, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font fontN = new com.lowagie.text.Font(bf, 11);

            document.open();
            com.lowagie.text.Paragraph titleP = new com.lowagie.text.Paragraph(title, fontTitle);
            titleP.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(titleP);
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));

            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(2);
            table.setWidthPercentage(100);
            addKv(table, "성명", employeeName, fontH, fontN);
            addKv(table, "사업장명", store != null ? nvl(store.getStoreName()) : "-", fontH, fontN);
            if (store != null && store.getBusinessNumber() != null && !store.getBusinessNumber().isBlank()) {
                addKv(table, "사업자등록번호", store.getBusinessNumber(), fontH, fontN);
            }
            addKv(table, "입사일", hireDate != null ? hireDate.toString() : "-", fontH, fontN);
            addKv(table, type == CertificateType.EMPLOYMENT ? "재직기간" : "근무기간", periodText, fontH, fontN);
            document.add(table);

            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(statement, fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph("발급일: " + today, fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(
                    "발급: 소담(SODAM) — 본 증명서는 전자 문서로 유효합니다.", fontN));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("증명서 PDF 생성 실패", e);
            throw new IllegalStateException("증명서 PDF 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    /** 재직기간 문구 — 퇴사일 컬럼이 없어 비활성 관계는 퇴사(일자 미기재)로 표기. */
    private String buildPeriodText(LocalDate hireDate, boolean active) {
        String start = hireDate != null ? hireDate.toString() : "-";
        return active
                ? start + " ~ 현재 (재직 중)"
                : start + " ~ 퇴사 (퇴사일 미기재)";
    }

    private static void addKv(com.lowagie.text.pdf.PdfPTable t, String k, String v,
                              com.lowagie.text.Font fh, com.lowagie.text.Font fn) {
        t.addCell(new com.lowagie.text.Phrase(k, fh));
        t.addCell(new com.lowagie.text.Phrase(v, fn));
    }

    private static String nvl(String s) {
        return s == null ? "-" : s;
    }
}
