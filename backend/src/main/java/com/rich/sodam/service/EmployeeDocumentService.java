package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeDocument;
import com.rich.sodam.domain.type.DocumentType;
import com.rich.sodam.dto.request.EmployeeDocumentCreateRequest;
import com.rich.sodam.dto.response.EmployeeDocumentResponse;
import com.rich.sodam.repository.EmployeeDocumentRepository;
import com.rich.sodam.repository.LaborContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeDocumentService {

    private final EmployeeDocumentRepository repository;
    private final LaborContractRepository laborContractRepository;

    @Transactional
    public EmployeeDocumentResponse add(Long employeeId, Long storeId, EmployeeDocumentCreateRequest req) {
        EmployeeDocument doc = repository.save(EmployeeDocument.create(
                employeeId, storeId, req.getType(), req.getTitle(),
                req.getFileRef(), req.getIssuedAt(), req.getExpiresAt()));
        return toResponse(doc, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> listForEmployee(Long employeeId, Long storeId) {
        LocalDate today = LocalDate.now();
        return repository.findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(employeeId, storeId).stream()
                .map(d -> toResponse(d, today))
                .toList();
    }

    /** 매장 전체 만료 임박/도래 서류(오래된 만료일 우선). */
    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> expiringSoon(Long storeId, int withinDays) {
        LocalDate today = LocalDate.now();
        LocalDate threshold = today.plusDays(withinDays);
        return repository.findByStoreIdAndExpiresAtLessThanEqualOrderByExpiresAtAsc(storeId, threshold).stream()
                .map(d -> toResponse(d, today))
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

    /**
     * 근로계약서 발송 시 서류함에 자동 연동한다(사장이 근로계약서를 보내면 직원 서류함에 노출).
     * 동일 계약(employeeId, storeId, type=LABOR_CONTRACT, fileRef=contractId)이 이미 있으면
     * 건너뛴다(재발송 시 중복 생성 방지). 서명 상태는 저장하지 않고 {@link #toResponse}가
     * {@code labor_contract} 원본에서 매번 실시간으로 읽어온다.
     */
    @Transactional
    public void linkLaborContract(Long storeId, Long employeeId, Long contractId, LocalDate issuedAt) {
        String fileRef = String.valueOf(contractId);
        boolean alreadyLinked = repository.findByEmployeeIdAndStoreIdAndTypeAndFileRef(
                employeeId, storeId, DocumentType.LABOR_CONTRACT, fileRef).isPresent();
        if (alreadyLinked) {
            return;
        }
        repository.save(EmployeeDocument.create(
                employeeId, storeId, DocumentType.LABOR_CONTRACT, "근로계약서", fileRef, issuedAt, null));
    }

    /**
     * 근로계약서(LABOR_CONTRACT) 서류는 fileRef(=계약 id)로 원본 계약을 조회해 서명 상태를
     * 실시간 반영한다. 원본을 찾을 수 없으면(삭제 등) 조용히 세 필드를 null로 둔다 — 목록 조회를
     * 깨뜨리지 않는다.
     */
    private EmployeeDocumentResponse toResponse(EmployeeDocument d, LocalDate today) {
        if (d.getType() != DocumentType.LABOR_CONTRACT) {
            return EmployeeDocumentResponse.from(d, today);
        }
        Long contractId = parseContractId(d.getFileRef());
        if (contractId == null) {
            return EmployeeDocumentResponse.from(d, today);
        }
        return laborContractRepository.findById(contractId)
                .<EmployeeDocumentResponse>map(contract -> EmployeeDocumentResponse.from(
                        d, today, contract.getId(), contract.isSigned(), contract.getEmployeeSignedAt()))
                .orElseGet(() -> {
                    log.warn("서류함 근로계약서 연동 원본을 찾을 수 없어요. documentId={}, contractId={}",
                            d.getId(), contractId);
                    return EmployeeDocumentResponse.from(d, today);
                });
    }

    private Long parseContractId(String fileRef) {
        if (fileRef == null || fileRef.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(fileRef.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
