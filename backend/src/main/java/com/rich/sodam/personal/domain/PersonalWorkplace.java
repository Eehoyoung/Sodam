package com.rich.sodam.personal.domain;

import com.rich.sodam.config.crypto.IntegerCryptoConverter;
import com.rich.sodam.config.crypto.StringCryptoConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * 개인 근무지 엔터티
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "personal_workplace",
       indexes = {
           @Index(name = "idx_pw_user_id_id_desc", columnList = "user_id, id")
       })
public class PersonalWorkplace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Convert(converter = StringCryptoConverter.class)
    @Column(name = "name", nullable = false, length = 1024)
    private String name;

    @Convert(converter = StringCryptoConverter.class)
    @Column(name = "address", length = 1024)
    private String address;

    @Convert(converter = IntegerCryptoConverter.class)
    @Column(name = "hourly_wage", nullable = false, length = 255)
    private Integer hourlyWage;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (hourlyWage == null) hourlyWage = 0;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
