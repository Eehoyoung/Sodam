package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "master_store_relation",
        // 같은 사업자가 같은 매장을 중복 등록할 이유 없음 — 재시도 시 중복 행 생성 방지(§2.12)
        uniqueConstraints = @UniqueConstraint(name = "uq_master_store_relation",
                columnNames = {"master_id", "store_id"}))
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