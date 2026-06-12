package com.rich.sodam.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfGState;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;

/**
 * 급여명세서 PDF 미리보기 워터마크. 매장 사장 플랜이 명세서 PDF 발급 권한(STARTER+)을 보유하지 않을 때
 * 각 페이지에 반투명 대각선 문구를 깔아 "정식 발급 아님"을 표시한다. (수익화 확정안 §1·§9)
 */
final class PayslipWatermarkEvent extends PdfPageEventHelper {

    private final BaseFont font;
    private final String text;

    PayslipWatermarkEvent(BaseFont font, String text) {
        this.font = font;
        this.text = text;
    }

    @Override
    public void onEndPage(PdfWriter writer, Document document) {
        PdfContentByte cb = writer.getDirectContentUnder();
        Rectangle pageSize = document.getPageSize();
        cb.saveState();
        PdfGState gs = new PdfGState();
        gs.setFillOpacity(0.12f);
        cb.setGState(gs);
        cb.beginText();
        cb.setColorFill(Color.GRAY);
        cb.setFontAndSize(font, 28);
        cb.showTextAligned(Element.ALIGN_CENTER, text,
                pageSize.getWidth() / 2, pageSize.getHeight() / 2, 45);
        cb.endText();
        cb.restoreState();
    }
}
