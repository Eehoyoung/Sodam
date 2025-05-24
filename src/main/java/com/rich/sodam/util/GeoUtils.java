package com.rich.sodam.util;

/**
 * 위치 정보 관련 유틸리티 클래스
 * 위도/경도 좌표를 이용한 위치 계산 기능을 제공합니다.
 */
public class GeoUtils {

    private static final int EARTH_RADIUS = 6371; // 지구 반지름 (km)

    private GeoUtils() {
        // 유틸리티 클래스는 인스턴스화를 방지합니다.
    }

    /**
     * 두 지점간의 거리를 계산합니다 (미터 단위).
     * Haversine 공식을 사용하여 지구 표면에서의 두 지점 간 최단 거리를 계산합니다.
     *
     * @param lat1 첫 번째 지점의 위도
     * @param lon1 첫 번째 지점의 경도
     * @param lat2 두 번째 지점의 위도
     * @param lon2 두 번째 지점의 경도
     * @return 두 지점 간의 거리 (미터)
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS * c * 1000; // 미터로 변환
    }

    /**
     * 주어진 좌표가 중심점을 기준으로 지정된 반경 내에 있는지 확인합니다.
     *
     * @param centerLat      중심점 위도
     * @param centerLon      중심점 경도
     * @param pointLat       확인할 지점 위도
     * @param pointLon       확인할 지점 경도
     * @param radiusInMeters 반경 (미터)
     * @return 반경 내 포함 여부
     */
    public static boolean isPointInRadius(double centerLat, double centerLon,
                                          double pointLat, double pointLon,
                                          double radiusInMeters) {
        double distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
        return distance <= radiusInMeters;
    }
}