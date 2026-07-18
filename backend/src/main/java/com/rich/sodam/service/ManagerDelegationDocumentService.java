package com.rich.sodam.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.rich.sodam.core.electronicsignature.ElectronicSignaturePdfSupport;
import com.rich.sodam.domain.type.ManagerPermission;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Set;

/** 서명 이후 수정하지 않는 매니저 권한 위임장 PDF를 1회 생성한다. */
@Service
public class ManagerDelegationDocumentService {

    public byte[] render(Long storeId, Long masterId, Long employeeId, int version,
                         Set<ManagerPermission> permissions) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 48, 48, 48, 48);
            PdfWriter.getInstance(document, out);
            document.addTitle("Sodam Manager Delegation v" + version);
            document.addCreator("SODAM");
            document.open();
            Font title = ElectronicSignaturePdfSupport.titleFont();
            Font body = ElectronicSignaturePdfSupport.bodyFont();
            document.add(new Paragraph("매장 운영 권한 위임장", title));
            document.add(new Paragraph("문서 버전: " + version, body));
            document.add(new Paragraph("매장 식별자: " + storeId, body));
            document.add(new Paragraph("위임자 식별자: " + masterId, body));
            document.add(new Paragraph("수임자 식별자: " + employeeId, body));
            document.add(new Paragraph("위임 권한", body));
            for (ManagerPermission permission : ManagerPermission.values()) {
                if (permissions.contains(permission)) document.add(new Paragraph("- " + permission.name(), body));
            }
            document.add(new Paragraph(
                    "수임자는 위 권한을 해당 매장 운영에 필요한 범위에서만 행사하며 재위임할 수 없습니다. " +
                            "권한 축소·해제·퇴사 시 권한은 즉시 중단됩니다. 양 당사자가 동일 문서 해시를 " +
                            "전자서명 검증한 때에만 본 위임이 발효됩니다.", body));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("매니저 권한 위임장 생성에 실패했습니다.", e);
        }
    }
}
