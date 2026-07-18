package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class DelegatedActionAuthorityServiceTest {
    private final StoreAccessGuard guard = mock(StoreAccessGuard.class);
    private final EmployeeStoreRelationRepository relations = mock(EmployeeStoreRelationRepository.class);
    private final MasterStoreRelationRepository masters = mock(MasterStoreRelationRepository.class);
    private final DelegatedActionAuthorityService service =
            new DelegatedActionAuthorityService(guard, relations, masters);

    @Test
    void revokedOrChangedDelegationCannotFinalizeIssuedContract() {
        ReflectionTestUtils.setField(service, "managerContractSigningEnabled", true);
        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 100L, 10L, 1,
                "a".repeat(64), "v1.k1.unsigned", 2L);
        envelope.bindDelegatedAuthority(2L, 1L, 88L, 3);
        EmployeeStoreRelation revoked = mock(EmployeeStoreRelation.class);
        when(guard.isManagerDelegationEnabled()).thenReturn(true);
        when(relations.findRelationForUpdate(2L, 10L)).thenReturn(Optional.of(revoked));
        when(revoked.hasActiveManagerPermission(ManagerPermission.CONTRACT_MANAGE)).thenReturn(false);

        assertThatThrownBy(() -> service.revalidateContractEnvelope(envelope))
                .isInstanceOf(AccessDeniedException.class);

        verify(guard).assertManagerPermission(2L, 10L, ManagerPermission.CONTRACT_MANAGE);
        verifyNoInteractions(masters);
    }
}
