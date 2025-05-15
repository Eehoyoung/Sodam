package com.rich.sodam.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class KakaoApiResponse {

    @JsonProperty("documents")
    private List<Documents> documents;

    @JsonProperty("meta")
    private Meta meta;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Documents {
        @JsonProperty("address_name")
        private String addressName;

        @JsonProperty("y")
        private String latitude;

        @JsonProperty("x")
        private String longitude;

        @JsonProperty("address_type")
        private String addressType;

        @JsonProperty("address")
        private Address address;

        @JsonProperty("road_address")
        private RoadAddress roadAddress;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Address {
        @JsonProperty("address_name")
        private String addressName;

        @JsonProperty("region_1depth_name")
        private String region1depthName;

        @JsonProperty("region_2depth_name")
        private String region2depthName;

        @JsonProperty("region_3depth_name")
        private String region3depthName;

        @JsonProperty("region_3depth_h_name")
        private String region3depthHName;

        @JsonProperty("h_code")
        private String hCode;

        @JsonProperty("b_code")
        private String bCode;

        @JsonProperty("mountain_yn")
        private String mountainYn;

        @JsonProperty("main_address_no")
        private String mainAddressNo;

        @JsonProperty("sub_address_no")
        private String subAddressNo;

        @JsonProperty("x")
        private String longitude;

        @JsonProperty("y")
        private String latitude;

    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class RoadAddress {
        @JsonProperty("address_name")
        private String addressName;

        @JsonProperty("region_1depth_name")
        private String region1depthName;

        @JsonProperty("region_2depth_name")
        private String region2depthName;

        @JsonProperty("region_3depth_name")
        private String region3depthName;

        @JsonProperty("road_name")
        private String roadName;

        @JsonProperty("underground_yn")
        private String undergroundYn;

        @JsonProperty("main_building_no")
        private String mainBuildingNo;

        @JsonProperty("sub_building_no")
        private String subBuildingNo;

        @JsonProperty("building_name")
        private String buildingName;

        @JsonProperty("zone_no")
        private String zoneNo;

        @JsonProperty("x")
        private String longitude;

        @JsonProperty("y")
        private String latitude;

    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Meta {
        @JsonProperty("total_count")
        private Integer totalCount;

        @JsonProperty("pageable_count")
        private Integer pageableCount;

        @JsonProperty("is_end")
        private boolean isEnd;
    }
}