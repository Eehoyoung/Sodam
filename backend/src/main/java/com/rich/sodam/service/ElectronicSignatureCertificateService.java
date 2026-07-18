package com.rich.sodam.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfWriter;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureParty;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

/** 원본 PDF를 변경하지 않고 검증 메타데이터만 담은 별도 완료증명서를 생성한다. */
@Service
public class ElectronicSignatureCertificateService {
    public byte[] render(ElectronicSignatureEnvelope envelope, List<ElectronicSignatureParty> parties) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 48, 48, 48, 48);
            PdfWriter.getInstance(document, out);
            document.addTitle("Sodam Electronic Signature Certificate");
            document.addCreator("SODAM");
            document.open();
            BaseFont base;
            try {
                base = BaseFont.createFont("HYSMyeongJoStd-Medium", "UniKS-UCS2-H", BaseFont.NOT_EMBEDDED);
            } catch (Exception ignored) {
                base = BaseFont.createFont();
            }
            Font title = new Font(base, 18, Font.BOLD);
            Font body = new Font(base, 10);
            document.add(new Paragraph("전자서명 완료증명서", title));
            document.add(new Paragraph("Envelope: " + envelope.getId(), body));
            document.add(new Paragraph("Subject: " + envelope.getSubjectType() + " / " + envelope.getSubjectId(), body));
            document.add(new Paragraph("Document version: " + envelope.getDocumentVersion(), body));
            document.add(new Paragraph("Document SHA-256: " + envelope.getDocumentSha256(), body));
            document.add(new Paragraph("Completed at: " + envelope.getCompletedAt(), body));
            if (envelope.getAuthorityEnvelopeId() != null) {
                document.add(new Paragraph("Delegated by user: " + envelope.getDelegatedByMasterId(), body));
                document.add(new Paragraph("Signing actor: " + envelope.getSigningActorUserId(), body));
                document.add(new Paragraph("Authority envelope/version: " + envelope.getAuthorityEnvelopeId()
                        + " / " + envelope.getAuthorityVersion(), body));
            }
            for (ElectronicSignatureParty party : parties) {
                document.add(new Paragraph(
                        party.getSigningOrder() + ". " + party.getSignerRole()
                                + " / verified=" + party.getVerifiedAt()
                                + " / evidence SHA-256=" + party.getSignedDataSha256(), body));
            }
            document.add(new Paragraph("이 증명서는 서명 대상 원본 PDF와 별도 문서이며 원본 바이트를 변경하지 않습니다.", body));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("전자서명 완료증명서 생성에 실패했습니다.", e);
        }
    }
}
