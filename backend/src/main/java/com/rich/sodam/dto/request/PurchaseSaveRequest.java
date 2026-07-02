package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.PurchaseCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 매입 저장/수정 요청. OCR 초안을 사장이 보정한 최종본.
 */
@Getter
@Setter
public class PurchaseSaveRequest {

    @NotBlank(message = "거래처명을 입력해 주세요.")
    private String vendorName;

    @NotNull(message = "매입 일자를 입력해 주세요.")
    private LocalDate purchaseDate;

    @NotNull(message = "분류를 선택해 주세요.")
    private PurchaseCategory category;

    private String memo;

    /** 영수증 이미지 저장 ref(선택). */
    private String imageRef;

    /** 부가세 매입자료용(선택). */
    private Integer supplyAmount;
    private Integer vatAmount;

    @NotEmpty(message = "품목을 한 개 이상 입력해 주세요.")
    @Valid
    private List<ItemRequest> items;

    @Getter
    @Setter
    public static class ItemRequest {
        @NotBlank(message = "품목명을 입력해 주세요.")
        private String itemName;

        @Positive(message = "수량은 0보다 커야 해요.")
        private double quantity;

        private String unit;

        @PositiveOrZero(message = "단가는 0 이상이어야 해요.")
        private int unitPrice;
    }
}
