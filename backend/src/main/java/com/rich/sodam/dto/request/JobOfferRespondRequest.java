package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * {@code PUT /api/job-offers/{offerId}/respond} 요청(260711_작업통합.md Part 2 §15.3).
 *
 * @param accept true=수락, false=거절
 */
public record JobOfferRespondRequest(
        @NotNull(message = "수락 여부는 필수입니다.") Boolean accept
) {
}
