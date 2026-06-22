package com.rich.sodam.service;

import com.rich.sodam.service.ReceiptOcrClient.DraftItem;
import com.rich.sodam.service.ReceiptOcrClient.ReceiptDraft;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CLOVA Receipt 응답 → ReceiptDraft 순수 파싱 로직 단위 테스트.
 * 외부 호출 없이 샘플 JSON 만으로 매핑 정확성·실패안전성을 검증한다.
 */
class ClovaReceiptOcrClientTest {

    /** CLOVA OCR Receipt V2 응답 스펙에 맞춘 대표 샘플(상호/일자/품목 2건). */
    private static final String SAMPLE = """
            {
              "images": [
                {
                  "receipt": {
                    "result": {
                      "storeInfo": {
                        "name": {
                          "text": "행복마트 강남점",
                          "formatted": { "value": "행복마트 강남점" }
                        }
                      },
                      "paymentInfo": {
                        "date": {
                          "text": "2026-06-10",
                          "formatted": { "year": "2026", "month": "06", "day": "10" }
                        }
                      },
                      "subResults": [
                        {
                          "items": [
                            {
                              "name": { "text": "대파 1단", "formatted": { "value": "대파 1단" } },
                              "count": { "text": "2", "formatted": { "value": "2" } },
                              "price": {
                                "price": { "text": "7000", "formatted": { "value": "7000" } },
                                "unitPrice": { "text": "3500", "formatted": { "value": "3500" } }
                              }
                            },
                            {
                              "name": { "text": "삼겹살 500g", "formatted": { "value": "삼겹살 500g" } },
                              "count": { "text": "1", "formatted": { "value": "1" } },
                              "price": {
                                "price": { "text": "12000", "formatted": { "value": "12000" } },
                                "unitPrice": { "text": "12000", "formatted": { "value": "12000" } }
                              }
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
            """;

    @Test
    @DisplayName("상호/일자/품목·수량·단가를 정확히 매핑한다")
    void parsesStoreDateAndItems() {
        ReceiptDraft draft = ClovaReceiptOcrClient.parseClovaResponse(SAMPLE);

        assertThat(draft.vendorName()).isEqualTo("행복마트 강남점");
        assertThat(draft.purchaseDate()).isEqualTo(LocalDate.of(2026, 6, 10));
        assertThat(draft.items()).hasSize(2);

        DraftItem first = draft.items().get(0);
        assertThat(first.itemName()).isEqualTo("대파 1단");
        assertThat(first.quantity()).isEqualTo(2.0);
        assertThat(first.unitPrice()).isEqualTo(3500);

        DraftItem second = draft.items().get(1);
        assertThat(second.itemName()).isEqualTo("삼겹살 500g");
        assertThat(second.quantity()).isEqualTo(1.0);
        assertThat(second.unitPrice()).isEqualTo(12000);
    }

    @Test
    @DisplayName("단가 누락 시 총액(price)으로 보정한다")
    void fallsBackToTotalPriceWhenUnitPriceMissing() {
        String json = """
                {
                  "images": [{ "receipt": { "result": {
                    "storeInfo": { "name": { "text": "동네슈퍼" } },
                    "subResults": [{ "items": [
                      { "name": { "text": "콜라" }, "price": { "price": { "text": "1500" } } }
                    ]}]
                  }}}]
                }
                """;
        ReceiptDraft draft = ClovaReceiptOcrClient.parseClovaResponse(json);

        assertThat(draft.vendorName()).isEqualTo("동네슈퍼");
        assertThat(draft.items()).hasSize(1);
        assertThat(draft.items().get(0).itemName()).isEqualTo("콜라");
        assertThat(draft.items().get(0).quantity()).isEqualTo(1.0); // count 없으면 1
        assertThat(draft.items().get(0).unitPrice()).isEqualTo(1500);
    }

    @Test
    @DisplayName("품목명이 없는 행은 건너뛴다")
    void skipsItemsWithoutName() {
        String json = """
                {
                  "images": [{ "receipt": { "result": {
                    "subResults": [{ "items": [
                      { "count": { "text": "3" }, "price": { "unitPrice": { "text": "100" } } },
                      { "name": { "text": "우유" }, "price": { "unitPrice": { "text": "2900" } } }
                    ]}]
                  }}}]
                }
                """;
        ReceiptDraft draft = ClovaReceiptOcrClient.parseClovaResponse(json);

        assertThat(draft.items()).hasSize(1);
        assertThat(draft.items().get(0).itemName()).isEqualTo("우유");
    }

    @Test
    @DisplayName("result 노드가 없으면 빈 초안을 반환한다")
    void returnsEmptyWhenNoResult() {
        ReceiptDraft draft = ClovaReceiptOcrClient.parseClovaResponse("{\"images\":[]}");

        assertThat(draft.vendorName()).isNull();
        assertThat(draft.purchaseDate()).isNull();
        assertThat(draft.items()).isEmpty();
    }

    @Test
    @DisplayName("잘못된 JSON·null·빈 문자열은 예외 없이 빈 초안을 반환한다")
    void returnsEmptyOnMalformedInput() {
        assertThat(ClovaReceiptOcrClient.parseClovaResponse(null).items()).isEmpty();
        assertThat(ClovaReceiptOcrClient.parseClovaResponse("").items()).isEmpty();
        assertThat(ClovaReceiptOcrClient.parseClovaResponse("not-json{{{").items()).isEmpty();
    }

    @Test
    @DisplayName("비표준 날짜(월 13)는 null 로 두고 흐름을 유지한다")
    void invalidDateBecomesNull() {
        String json = """
                {
                  "images": [{ "receipt": { "result": {
                    "storeInfo": { "name": { "text": "가게" } },
                    "paymentInfo": { "date": { "formatted": { "year": "2026", "month": "13", "day": "40" } } },
                    "subResults": [{ "items": [ { "name": { "text": "물" }, "price": { "unitPrice": { "text": "900" } } } ] }]
                  }}}]
                }
                """;
        ReceiptDraft draft = ClovaReceiptOcrClient.parseClovaResponse(json);

        assertThat(draft.purchaseDate()).isNull();
        assertThat(draft.items()).hasSize(1);
    }
}
