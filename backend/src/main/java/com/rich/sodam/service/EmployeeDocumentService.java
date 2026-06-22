package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeDocument;
import com.rich.sodam.dto.request.EmployeeDocumentCreateRequest;
import com.rich.sodam.dto.response.EmployeeDocumentResponse;
import com.rich.sodam.repository.EmployeeDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 직원 서류함 서비스 (A5). 보관 + 만료 임박 조회. 권한 검증은 컨트롤러(StoreAccessGuard).
 *
 * <p>PII: 원본 파일 미저장(fileRef 참조만).
 */
@Service
@RequiredArgsConstructor
public class EmployeeDocumentService {

    private final EmployeeDocumentRepository repository;

    @Transactional
    public EmployeeDocumentResponse add(Long employeeId, Long storeId, EmployeeDocumentCreateRequest req) {
        EmployeeDocument doc = repository.save(EmployeeDocument.create(
                employeeId, storeId, req.getType(), req.getTitle(),
                req.getFileRef(), req.getIssuedAt(), req.getExpiresAt()));
        return EmployeeDocumentResponse.from(doc, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> listForEmployee(Long employeeId, Long storeId) {
        LocalDate today = LocalDate.now();
        return repository.findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(employeeId, storeId).stream()
                .map(d -> EmployeeDocumentResponse.from(d, today))
                .toList();
    }

    /** 매장 전체 만료 임박/도래 서류(오래된 만료일 우선). */
    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> expiringSoon(Long storeId, int withinDays) {
        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(withinDays);
        return repository.findByStoreIdAndExpiresAtLessThanEqualOrderByExpiresAtAsc(storeId, threshold).stream()
                .map(d -> EmployeeDocumentResponse.from(d, today))
                .toList();
    }

    @Transactional
    public void delete(Long storeId, Long docId) {
        EmployeeDocument doc = repository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("서류를 찾을 수 없어요: " + docId));
        if (!doc.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 서류가 아니에요.");
        }
        repository.delete(doc);
    }
}
