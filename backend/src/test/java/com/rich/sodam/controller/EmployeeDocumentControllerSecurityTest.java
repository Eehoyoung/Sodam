package com.rich.sodam.controller;

import com.rich.sodam.domain.type.DocumentType;
import com.rich.sodam.dto.request.EmployeeDocumentCreateRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.EmployeeDocumentService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EmployeeDocumentControllerSecurityTest {

    @Test
    void masterCannotAttachSensitiveDocumentToEmployeeOutsideTheStore() {
        EmployeeDocumentService documents = mock(EmployeeDocumentService.class);
        StoreAuthorizationPolicy guard = mock(StoreAuthorizationPolicy.class);
        EmployeeDocumentController controller = new EmployeeDocumentController(documents, guard);
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(1L);
        doThrow(new AccessDeniedException("outside store"))
                .when(guard).assertEmployeeInStore(2L, 10L);

        EmployeeDocumentCreateRequest request = new EmployeeDocumentCreateRequest();
        request.setType(DocumentType.HEALTH_CERTIFICATE);
        request.setTitle("보건증");

        assertThatThrownBy(() -> controller.add(principal, 10L, 2L, request))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(documents);
    }
}
