package com.rich.sodam.domain.type;


import lombok.Getter;

@Getter
public enum TaxPolicyType {
    INCOME_TAX_3_3("소득세 3.3%"),
    FOUR_INSURANCES("4대보험");

    private final String description;

    TaxPolicyType(String description) {
        this.description = description;
    }
}
