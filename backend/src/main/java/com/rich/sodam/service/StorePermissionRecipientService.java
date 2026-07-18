package com.rich.sodam.service;

import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.StoreRole;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StorePermissionRecipientService {
    private final MasterStoreRelationRepository masterRepository;
    private final EmployeeStoreRelationRepository employeeRepository;
    private final PlanAccessService planAccessService;

    @Transactional(readOnly = true)
    public List<Long> owners(Long storeId) {
        return masterRepository.findByStore_Id(storeId).stream()
                .filter(r -> r.getMasterProfile() != null && r.getMasterProfile().getUser() != null)
                .map(r -> r.getMasterProfile().getUser().getId())
                .distinct().toList();
    }

    @Transactional(readOnly = true)
    public List<Long> ownersAndManagers(Long storeId, ManagerPermission permission) {
        LinkedHashSet<Long> recipients = new LinkedHashSet<>(owners(storeId));
        if (planAccessService.storeOwnerHasFeature(storeId, PlanFeature.MANAGER_DELEGATION)) {
            employeeRepository.findByStore_IdAndStoreRoleAndIsActiveTrue(storeId, StoreRole.MANAGER).stream()
                    .filter(r -> r.hasActiveManagerPermission(permission))
                    .map(r -> r.getEmployeeProfile().getId())
                    .forEach(recipients::add);
        }
        return List.copyOf(recipients);
    }
}
