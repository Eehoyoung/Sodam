package com.rich.sodam.domain;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.sql.Blob;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ElectronicSignatureDataMinimizationTest {
    @Test
    void persistenceModelHasNoRawSignaturePdfOrDuplicatedIdentityFields() {
        Set<String> fieldNames = Arrays.stream(new Class<?>[]{
                        ElectronicSignatureEnvelope.class,
                        ElectronicSignatureParty.class,
                        ElectronicSignatureAttempt.class,
                        ElectronicSignatureOutbox.class})
                .flatMap(type -> Arrays.stream(type.getDeclaredFields()))
                .map(Field::getName)
                .collect(Collectors.toSet());

        assertThat(fieldNames).doesNotContain(
                "signedData", "pdf", "documentBytes", "signatureImage",
                "name", "phone", "birthday", "birthDate", "ci", "appScheme", "marketUrl");
        Arrays.stream(new Class<?>[]{ElectronicSignatureEnvelope.class, ElectronicSignatureParty.class})
                .flatMap(type -> Arrays.stream(type.getDeclaredFields()))
                .map(Field::getType)
                .forEach(type -> assertThat(type).isNotEqualTo(byte[].class).isNotEqualTo(Blob.class));
    }
}
