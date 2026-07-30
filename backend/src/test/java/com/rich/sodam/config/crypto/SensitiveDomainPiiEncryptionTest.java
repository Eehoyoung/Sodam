package com.rich.sodam.config.crypto;

import com.rich.sodam.domain.CustomerInquiry;
import com.rich.sodam.personal.domain.PersonalWorkplace;
import jakarta.persistence.Convert;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDomainPiiEncryptionTest {

    @Test
    void sensitiveWorkplaceAndInquiryFieldsUseEncryptedConverters() throws Exception {
        assertConverter(PersonalWorkplace.class, "name", StringCryptoConverter.class);
        assertConverter(PersonalWorkplace.class, "address", StringCryptoConverter.class);
        assertConverter(PersonalWorkplace.class, "hourlyWage", IntegerCryptoConverter.class);
        assertConverter(CustomerInquiry.class, "name", StringCryptoConverter.class);
        assertConverter(CustomerInquiry.class, "email", StringCryptoConverter.class);
        assertConverter(CustomerInquiry.class, "content", StringCryptoConverter.class);
    }

    @Test
    void integerConverterStoresCiphertextAndReadsItBackWithTheConfiguredKey() {
        SecretKey key = StringCryptoConverter.buildKey(new byte[32]);
        StringCryptoConverter.setKey(key);
        try {
            IntegerCryptoConverter converter = new IntegerCryptoConverter();
            String encrypted = converter.convertToDatabaseColumn(12500);
            assertThat(encrypted).startsWith("enc:v1:").doesNotContain("12500");
            assertThat(converter.convertToEntityAttribute(encrypted)).isEqualTo(12500);
        } finally {
            StringCryptoConverter.setKey(null);
        }
    }

    private void assertConverter(Class<?> type, String fieldName, Class<?> expected) throws Exception {
        Field field = type.getDeclaredField(fieldName);
        Convert convert = field.getAnnotation(Convert.class);
        assertThat(convert).isNotNull();
        assertThat(convert.converter()).isEqualTo(expected);
    }
}
