package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class MasterStoreRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "master_id")
    private MasterProfile masterProfile;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    private LocalDateTime registeredAt;

    public MasterStoreRelation(MasterProfile masterProfile, Store store) {
        this.masterProfile = masterProfile;
        this.store = store;
        this.registeredAt = LocalDateTime.now();
    }
}