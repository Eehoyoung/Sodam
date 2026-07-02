package com.rich.sodam.dto.response;

/**
 * 인앱 시즌 캠페인 (T-NEW-07). 시기별(종소세 5월·부가세 분기 등) 안내 배너.
 *
 * @param key       캠페인 식별자
 * @param title     배너 제목
 * @param message   안내 문구
 * @param deepLink  탭 시 이동(앱 내 딥링크/외부링크)
 */
public record CampaignResponse(
        String key,
        String title,
        String message,
        String deepLink
) {
}
