package com.rich.sodam.service;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.domain.type.SignatureSignerRole;
import com.rich.sodam.domain.type.SignatureSubjectType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ElectronicSignatureEnvelopeViewTest {

    @Test
    void exposesViewerOrderWithoutExposingPartyUserIds() {
        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.MANAGER_DELEGATION, 10L, 20L, 1, "a".repeat(64), "encrypted-ref", 1L);
        ElectronicSignatureParty owner = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.OWNER, 1L, 1, ElectronicSignatureProvider.TOSS);
        ElectronicSignatureParty manager = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.MANAGER, 2L, 2, ElectronicSignatureProvider.TOSS);

        ElectronicSignatureApplicationService.EnvelopeView view =
                ElectronicSignatureApplicationService.EnvelopeView.of(envelope, List.of(owner, manager), 2L);

        assertThat(view.viewerPartyOrder()).isEqualTo(2);
        assertThat(view.parties()).extracting(ElectronicSignatureApplicationService.PartyView::order)
                .containsExactly(1, 2);
        assertThat(ElectronicSignatureApplicationService.PartyView.class.getDeclaredFields())
                .noneMatch(field -> field.getName().equals("userId"));
    }
}
