package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 근무 시프트 템플릿 (B10 후속). 매장별 주간 근무 패턴을 저장해 다른 주에 재적용한다.
 *
 * <p>확정 설계(사장 결정): 저장범위=주간패턴(직원 포함), 공유단위=매장별,
 * 직원결합=직원 고정(적용 시 비활성 직원 스킵). 스코프: 등록·적용만(자동배정 아님).
 */
@Entity
@Table(name = "shift_template", indexes = {
        @Index(name = "idx_shift_template_store", columnList = "store_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShiftTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_template_id")
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** 감사용 — 템플릿을 만든 사장(사용자) id. */
    @Column(name = "created_by_master_id")
    private Long createdByMasterId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ShiftTemplateEntry> entries = new ArrayList<>();

    private ShiftTemplate(Long storeId, String name, Long createdByMasterId) {
        this.storeId = storeId;
        this.name = name;
        this.createdByMasterId = createdByMasterId;
        this.createdAt = LocalDateTime.now();
    }

    public static ShiftTemplate create(Long storeId, String name, Long createdByMasterId) {
        return new ShiftTemplate(storeId, name, createdByMasterId);
    }

    public void addEntry(ShiftTemplateEntry entry) {
        entry.assignTemplate(this);
        this.entries.add(entry);
    }
}
