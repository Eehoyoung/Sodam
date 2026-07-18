package com.rich.sodam.core.electronicsignature;

import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;

/** 전자서명 고정 PDF의 한글 글꼴 선택을 한곳에서 관리한다. */
public final class ElectronicSignaturePdfSupport {
    private ElectronicSignaturePdfSupport() {}

    public static Font titleFont() {
        return new Font(baseFont(), 18, Font.BOLD);
    }

    public static Font bodyFont() {
        return new Font(baseFont(), 10);
    }

    private static BaseFont baseFont() {
        try {
            return BaseFont.createFont("HYSMyeongJoStd-Medium", "UniKS-UCS2-H", BaseFont.NOT_EMBEDDED);
        } catch (Exception ignored) {
            try {
                return BaseFont.createFont();
            } catch (Exception e) {
                throw new IllegalStateException("전자서명 PDF 글꼴을 초기화할 수 없습니다.", e);
            }
        }
    }
}
