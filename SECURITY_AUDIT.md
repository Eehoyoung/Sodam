# SECURITY_AUDIT

## 2026-07-30 web console, labor contract, and sensitive-document follow-up

### Scope and exclusions

- Reviewed locally: `web-master`, web-session authentication/CSRF/BFF code, password-reset credential storage, Apple authentication and global error logging, labor-contract and electronic-signature issuance/access paths, employee-document metadata, CSV exports, payment webhook logging, and break-record CRUD paths.
- Excluded: production sessions/data/backups, real signature-provider calls or cancellation, object-storage contents, deployment, push, and destructive actions.

### Security structure reviewed

- Web console: HttpOnly `sodam_web_sid` session cookie, SameSite=Strict CSRF cookie/header validation, login lockout and rate limit, and existing backend authorization for every business API.
- Password reset: a locally generated six-digit OTP and one-time reset ticket are persisted only as server-keyed HMAC digests; raw values are delivered only to the requesting client/email flow.
- Labor contract/signature: current store authority plus `CONTRACT_MANAGE` for delegated issuance; immutable PDF digest, private object references, party/owner access checks, and worker-side finalization validation.
- Sensitive documents: master-only store APIs with employee/store ownership checks; document metadata only, not a file-upload/download implementation.

### Finding summary

| ID | Severity | Status | Summary |
|---|---:|---|---|
| SEC-AUD-026 | High | Fixed locally | A revoked delegated manager remained a signature party and could read an in-progress labor contract; pending local signature work was not cancelled. |
| SEC-AUD-027 | Medium | Fixed | A store owner could attach/list/delete document metadata with a client-supplied employee path lacking an explicit employee-to-store check. |
| SEC-AUD-028 | Low | Hardened | Dashboard BFF interpolated an unvalidated `storeId` into internal paths and returned backend path/status details on failure. No backend authorization bypass was demonstrated. |
| SEC-AUD-029 | Medium | Fixed | CSV exports wrote employee names that spreadsheet applications could execute as formulas. |

| SEC-AUD-030 | Low | Fixed | The payment webhook logged a supplied HMAC signature when validation failed. |
| SEC-AUD-031 | Medium | Fixed | Break-record CRUD accepted an employee path without verifying store membership; deletion did not bind the record to that path employee. |

| SEC-AUD-032 | Medium | Fixed | Any authenticated user could create global Q&A entries, including administrator-style answers and uploads. |
| SEC-AUD-033 | High | Fixed | A database reader could brute-force the legacy fixed-salt hash of a six-digit password-reset OTP and take over the associated account. |
| SEC-AUD-034 | Medium | Fixed | An owner could read an unaffiliated employee's onboarding contract, wage-setup, and attendance-progress state by changing the employee path ID. |
| SEC-AUD-035 | Low | Fixed | The public Apple identity-token verification path logged decoder exception text, which can contain a caller-supplied token fragment. |
| SEC-AUD-036 | Medium | Fixed | Global validation and database-constraint handlers logged rejected request values and raw DB diagnostics, including passwords, OTPs, emails, and sensitive form fields. |
| SEC-AUD-037 | Low | Fixed | Sensitive contract, certificate, payroll, export, and tax-report download responses lacked browser-cache prevention headers. |
| SEC-AUD-038 | Low | Fixed | Session-authenticated WebSocket handshakes accepted every browser Origin, including untrusted same-site origins. |
| SEC-AUD-039 | Medium | Fixed | A deactivated employee-store relation still allowed GPS/NFC automatic attendance creation and checkout. |
| SEC-AUD-040 | Medium | Fixed | Historical employee-store membership checks allowed deactivated employees to use several current-state employee and real-time functions. |

### Detailed findings

#### SEC-AUD-026 — revoked delegated contract signer retained sensitive-document access (High)

- Related files/functions: `ElectronicSignatureApplicationService.assertEnvelopeAccess`, `DelegatedActionAuthorityService`, `StoreManagerService`, `LaborContractElectronicSignatureService`.
- Code path: a manager listed in `electronic_signature_party` passed envelope access even after `CONTRACT_MANAGE` was removed/revoked. Existing authority revalidation occurred only during worker finalization.
- Attack conditions: the manager had been delegated contract authority, an unsigned labor-contract envelope existed, and the authority was later reduced or revoked.
- Impact: continued local access to wage/employment contract PDF and status; pending local work could continue until eventual finalization failed.
- Verification: unit regression reproduced a historical manager party whose current authority check rejects access; cancellation regression verifies envelope, parties, and outbox work become `CANCELLED`.
- Fix: delegated signer access now requires current active authority with the matching delegation envelope/version and current owner. Permission reduction/removal and revocation cancel unfinished delegated labor-contract envelopes, parties, and queued work. A cancelled/failed envelope can be reissued only as the next document version; completed contracts cannot be replaced.
- Added tests: `ElectronicSignatureApplicationServiceAccessTest`, `DelegatedActionAuthorityServiceTest`, `DelegatedContractEnvelopeCancellationServiceTest`, `StoreManagerServiceTest`, `LaborContractElectronicSignatureServiceTest`, `LaborContractSignTest`.
- Post-fix verification: targeted backend suite passed.
- Residual risk: a signature provider request already delivered externally cannot be withdrawn by the current gateway interface. Local processing and contract activation are cancelled, but provider-side cancellation must be integrated and verified before a live delegated-signature launch.

#### SEC-AUD-027 — sensitive document employee scope was only implicit (Medium)

- Related files/functions: `EmployeeDocumentController`, `EmployeeDocumentService.delete`, `EmployeeDocumentCreateRequest`.
- Code path: add/list/delete accepted `employeeId` from the request path after only master-store authorization; deletion ignored the employee path when selecting a document.
- Attack conditions: a master for one store deliberately supplies an employee ID outside that store or a mismatched employee path.
- Impact: cross-store document metadata integrity pollution and misleading/mismatched destructive requests. No original document file was reachable through this path.
- Verification: controller regression makes `assertEmployeeInStore` deny before the document service is called.
- Fix: add/list/delete now verify the employee belongs to the path store; delete verifies both document store and employee. Title and reference length limits now match database columns.
- Added tests: `EmployeeDocumentControllerSecurityTest`.
- Post-fix verification: targeted backend suite passed.
- Residual risk: this domain stores a reference only; a future file upload/download feature requires separate MIME, size, path, and object-authorization review.

#### SEC-AUD-028 — dashboard BFF input/error hardening (Low)

- Related file/function: `web-master/src/app/api/bff/dashboard/route.ts`.
- Code path: an arbitrary query value was interpolated into fixed internal backend paths and failed backend paths/statuses were returned to the browser.
- Attack conditions: an authenticated or unauthenticated caller sends a malformed `storeId` query.
- Impact: no demonstrated access-control bypass because the backend still receives the session and performs store authorization; malformed input could probe internal route behavior.
- Verification: code path review plus web TypeScript and lint checks.
- Fix: accept only positive safe-integer store IDs and return a generic backend failure response.
- Added tests: no dedicated Next route test harness exists in this repository.
- Post-fix verification: `web-master` TypeScript and lint both pass.
- Residual risk: backend authorization remains the security boundary; BFF routes added later must keep fixed upstream hosts and validate every path parameter.

#### SEC-AUD-029 — CSV formula injection in sensitive exports (Medium)

- Related files/functions: `ExportService.buildAttendanceCsv`, `ExportService.buildPayrollCsv`, `ExportService.csvSafe`; employee profile name update paths in `UserController`.
- Code path: an authenticated employee can set a name whose enforced constraint is length. A store owner can export attendance or payroll CSV, and `csvSafe` escaped commas/quotes but emitted leading `=`, `+`, `-`, or `@` unchanged.
- Attack conditions: a store owner opens the exported CSV in a spreadsheet program that evaluates formulas, after a malicious employee has supplied a formula-like name.
- Impact: spreadsheet formula execution in the owner's desktop context, including misleading displayed data or spreadsheet-supported external-link/action abuse.
- Verification: the new regression failed before the fix with an exported `=HYPERLINK(...)` cell, proving the formula marker reached the CSV output.
- Fix: formula-like values, including markers after leading spaces or tabs, receive a leading apostrophe before CSV quoting. This keeps the cell as literal text in spreadsheet applications.
- Added tests: `ExportServiceSecurityTest` covers `=`, `+`, `-`, `@`, and leading-space/tab variants through the public attendance export path; payroll uses the same sanitizer.
- Post-fix verification: targeted backend test passes.
- Residual risk: values exported by future CSV columns must also use `csvSafe`; CSV output remains sensitive and master/store authorization is still required.

#### SEC-AUD-030 — payment webhook signature logged verbatim (Low)

- Related files/functions: `TossWebhookController.tossWebhook` and its failed-signature logging branch.
- Code path: the public `POST /api/billing/webhook/toss` endpoint receives `X-TossPayments-Signature`; a failed HMAC validation logged that supplied header value verbatim.
- Attack conditions: any caller can send an invalid webhook request. A genuine signature may also enter the branch if the locally configured secret is wrong.
- Impact: attacker-controlled log pollution and unnecessary retention of a replay-adjacent authentication value in application logs.
- Verification: before the fix, a local output-capture regression observed the supplied signature in the warning log.
- Fix: the failed-signature log retains only the event category and never the supplied signature.
- Added tests: `TossWebhookControllerSecurityTest` proves the invalid signature is absent from logs and a correctly signed payload still delegates to `TossWebhookService` with HTTP 200.
- Post-fix verification: both targeted tests pass locally.
- Residual risk: this check does not exercise a real Toss delivery or secret rotation. Production must inject a non-empty secret and protect log access.

#### SEC-AUD-031 — break-record employee/store scope and path ownership (Medium)

- Related files/functions: `BreakRecordController.add`, `list`, `delete`; `BreakRecordService.delete`.
- Code path: master-only break-record routes checked only that the caller owned `storeId`. A caller could supply a foreign `employeeId`; delete then selected by only `storeId` and record ID, ignoring the employee path.
- Attack conditions: an authenticated store owner deliberately sends a non-member employee ID or uses an employee path that differs from the record owner.
- Impact: cross-store break-record integrity pollution; a mismatched URL could delete a different employee's record in the same store, obscuring auditability and violating resource-path ownership.
- Verification: the new controller regression failed before the fix because it reached the service after `assertEmployeeInStore` was configured to deny. A service regression verifies a mismatched path employee cannot delete the record.
- Fix: all master break-record CRUD routes now assert employee/store membership before calling the service. Deletion receives the path employee ID and rejects a record owned by a different employee.
- Added tests: `BreakRecordControllerSecurityTest` and `BreakRecordServiceTest.deleteRejectsDifferentEmployeeInTheSameStore`.
- Post-fix verification: the controller test plus all 13 break-record service tests pass locally.
- Residual risk: master authority remains intentionally broad within an owned store. Future bulk endpoints must retain both store and per-record employee checks.

#### SEC-AUD-032 — global Q&A content creation lacked system-content authorization (Medium)

- Related files/functions: `QnaInfoController.createQnaInfo`, `QnaInfoService.createQnaInfo`, `SystemContentAdminOnly`.
- Code path: `POST /api/qna-info` inherited only `@AnyAuthenticated`, although it creates the same global Q&A entity that is read by all authenticated clients and accepts an administrator-style answer plus an optional image. The service records no requester or moderation state.
- Attack conditions: any valid authenticated account, including an unrelated store employee or owner, sends a multipart Q&A creation request.
- Impact: unauthorized global content injection/phishing and consumption of local upload storage. The route could present unreviewed answers as product information to other users.
- Verification: the new MockMvc regression expected 403 for a non-allowlisted store owner and failed before the fix with HTTP 200, proving service reachability.
- Fix: Q&A creation now requires the same fail-closed `SystemContentAdminOnly` allowlist used by other global content mutations.
- Added tests: `SecurityRbacTest.storeMaster_globalQnaCreate_forbidden` and `allowlistedSystemContentAdministrator_canCreateGlobalQnaContent`.
- Post-fix verification: both new paths pass in the 19-test RBAC integration class.
- Residual risk: global content still has no author/moderation workflow. Future public/community Q&A must use a separate requester-owned, moderated domain rather than this administrator content API.

#### SEC-AUD-033 — password-reset OTP used a predictable fixed-salt hash (High)

- Related files/functions: `PasswordResetService.requestReset`, `PasswordResetService.verifyCode`, `BearerTokenHasher`, and `PasswordResetToken.codeHash`.
- Code path: a reset request generated a six-digit OTP and persisted an unkeyed `SHA-256(fixed public salt + OTP)` digest. `POST /api/auth/password-reset/verify` accepts the email and OTP, then issues a usable reset ticket when that digest matches.
- Attack conditions: an attacker obtains a read-only database copy containing an unexpired reset-token row and the target email. Because the OTP space has only one million values and the fixed salt was in the application source, the matching OTP could be computed offline without access to the recipient mailbox.
- Impact: the attacker can submit the recovered OTP once, receive a reset ticket, set a new password, and take over the target account during the OTP validity window.
- Verification: a regression that requires the stored OTP digest to equal a server-keyed HMAC failed before the fix because the legacy SHA-256 value did not match. The public controller path confirms that a successful OTP verification returns a reset ticket.
- Fix: creation and verification now use the existing `BearerTokenHasher` HMAC-SHA-256 digest keyed by the required server-side `jwt.secret`; no raw OTP is persisted. The reset-ticket digest remains keyed as before.
- Added tests: `PasswordResetServiceSecurityTest.storesTheShortLivedOtpWithTheServerKeyedDigest` and `verifiesAnOtpStoredWithTheServerKeyedDigest`, alongside the existing reset-ticket digest regression.
- Post-fix verification: all three `PasswordResetServiceSecurityTest` tests pass locally; the known OTP verifies successfully, while the stored value is the keyed digest rather than a recoverable fixed-salt hash.
- Residual risk: a reset token issued by the legacy build cannot verify after this change; it expires within five minutes, so deployment must allow that short window to elapse or intentionally invalidate outstanding reset requests. Protection also depends on keeping `jwt.secret` non-empty and confidential; compromise of that key is a broader authentication incident.

#### SEC-AUD-034 — onboarding owner lookup lacked employee/store scope (Medium)

- Related files/functions: `OnboardingController.forOwner`, `OnboardingService.forEmployee`, and `StoreAuthorizationPolicy.assertEmployeeInStore`.
- Code path: `GET /api/stores/{storeId}/employees/{employeeId}/onboarding` required the caller to own `storeId`, but passed the client-supplied `employeeId` directly to the aggregation service. That service reads signed-contract, wage-relation, and attendance-existence state for the supplied employee/store pair.
- Attack conditions: an authenticated owner of any store knows or guesses another employee ID and uses it with a store ID the owner controls.
- Impact: cross-store disclosure of an employee's onboarding progress and associated employment/attendance state, plus a false resource association in the response.
- Verification: a controller regression configured the employee/store guard to deny a foreign employee. Before the fix, the request did not throw and reached the service, proving the missing authorization boundary.
- Fix: the owner endpoint now asserts that the path employee belongs to the path store after confirming the caller owns that store and before calling the aggregation service.
- Added tests: `OnboardingControllerSecurityTest.ownerOnboardingLookupRejectsAnEmployeeOutsideThePathStore`.
- Post-fix verification: the security regression and all existing `OnboardingServiceTest` tests pass locally.
- Residual risk: this is an aggregate status endpoint. Any new per-step details must retain the same store/employee relation check and avoid adding unnecessary employee data to the response.

#### SEC-AUD-035 — Apple identity-token decoder diagnostics were logged verbatim (Low)

- Related files/functions: `AppleAuthService.verifyIdentityToken` and `LoginController.appleLogin`.
- Code path: the public `POST /apple/auth/proc` endpoint passes the supplied identity token to `JwtDecoder`. A thrown `JwtException` had its message interpolated directly into the application warning log; downstream controller failure handling also exposed exception diagnostics to its localized error template.
- Attack conditions: any caller submits a malformed, expired, or otherwise rejected Apple identity token whose decoder diagnostic contains a token fragment or attacker-controlled text.
- Impact: authentication-bearing token fragments or untrusted diagnostics can be retained in logs and used for log pollution. No successful Apple account takeover was demonstrated from this path.
- Verification: a local JWT-decoder mock threw a `JwtException` whose message contained a synthetic identity-token fragment. The output-capture regression failed before the fix because the exact fragment appeared in the warning log.
- Fix: service and controller logs now record only the exception class. The client receives the existing generic Apple-authentication failure message rather than an exception diagnostic.
- Added tests: `AppleAuthServiceTest.decoderFailureMessageContainingAnIdentityTokenIsNotLogged`.
- Post-fix verification: the Apple service regression and existing `LoginControllerKakaoSecurityTest` pass locally.
- Residual risk: this test uses a local decoder mock and does not contact Apple JWKS. Production log access, retention, and third-party identity-provider diagnostics still require operational controls.

#### SEC-AUD-036 — global validation and constraint-error logging retained sensitive diagnostics (Medium)

- Related files/functions: `GlobalExceptionHandler.handleValidationException` and `handleDataIntegrityViolation`.
- Code path: every controller using `@Valid` can throw `MethodArgumentNotValidException`. The handler logged both `e.getMessage()` and the exception stack; Spring's diagnostic string contains each `FieldError` rejected value. The database-constraint handler also logged the raw most-specific SQL diagnostic, which can include duplicate column values.
- Attack conditions: a caller sends a validation-failing request containing a sensitive value, such as a password-reset password, OTP, resident number, or other PII field; or triggers a duplicate constraint involving a sensitive identifier such as an email.
- Impact: rejected secrets, PII, and duplicate database values are written to application logs even though API responses do not need those raw values. Anyone with log access can recover the submitted values.
- Verification: a local `MethodArgumentNotValidException` with a synthetic rejected password and a `DataIntegrityViolationException` with a synthetic duplicate email were passed through the real handlers. Both output-capture regressions failed before the fix because the exact values appeared in the logs.
- Fix: the validation handler now logs only the number and names of invalid fields, while the constraint handler logs only the exception-cause type. Neither logs exception diagnostics, rejected values, SQL details, or validation stack traces.
- Added tests: `GlobalExceptionHandlerSecurityTest.validationFailureDoesNotLogTheRejectedSecretValue` and `databaseConstraintDiagnosticsDoNotLogTheDuplicateSensitiveValue`.
- Post-fix verification: both regressions retain the existing HTTP 400/409 responses and confirm the sensitive test values are absent from captured logs.
- Residual risk: other exception handlers and third-party integrations still require per-path review before logging arbitrary exception messages or database diagnostics.

#### SEC-AUD-037 — sensitive downloads could remain in a browser cache (Low)

- Related files/functions: `SensitiveDownloadHeaders.apply`, `CertificateController.my`, `LaborContractController.pdfResponse`, `ElectronicSignatureController.document` and `completionCertificate`, `PayrollController.generatePayrollPdf`, `ExportController.exportAttendance` and `exportPayroll`, and `TaxReportController.previewLaborCostSummary`.
- Code path: each listed authenticated endpoint builds a PDF or CSV attachment containing employment, wage, attendance, signature, or tax-report data. Prior successful responses had neither `Cache-Control: no-store` nor legacy cache-prevention headers.
- Attack conditions: a legitimate user downloads one of these documents on a shared browser/device and a later local user can access the browser's cached download or response history. The attacker must already have local access to that browser/device; no remote authorization bypass was demonstrated.
- Impact: an employment/career certificate, labor contract, e-signature evidence, payroll statement/export, or labor-cost report may persist beyond the authenticated session on a shared endpoint.
- Verification: a controller-level regression invoked the real certificate download response path. Before the fix it failed because the response did not contain a cache-prevention header. Source-path review confirmed the same missing response policy on every listed sensitive attachment route.
- Fix: a shared `SensitiveDownloadHeaders` policy now adds `Cache-Control: no-store, private, must-revalidate`, `Pragma: no-cache`, and `X-Content-Type-Options: nosniff` to every listed sensitive download response. Existing authorization, document bytes, media types, and attachment filenames are unchanged.
- Added tests: `CertificateControllerSecurityTest.certificateDownloadPreventsSensitivePdfFromBeingStoredByBrowserCaches` and `SensitiveDownloadHeadersTest.appliesTheNonStorableDownloadPolicyForEverySensitiveAttachmentType`.
- Post-fix verification: the certificate response regression, the common-policy regression, all four `CertificateServiceTest` cases, and existing `PayrollControllerTest` pass locally, retaining authorized PDF generation, existing non-member denial behavior, and payroll-controller behavior.
- Residual risk: HTTP response headers cannot erase copies already downloaded, printed, screen-captured, or stored by a user. Sensitive-document routes added later need the same response policy and a separate access-control review.

#### SEC-AUD-038 — web-session WebSocket handshakes trusted every browser Origin (Low)

- Related files/functions: `WebSocketConfig.registerStompEndpoints`, `SessionHandshakeInterceptor.beforeHandshake`, `WebSocketOriginHandshakeInterceptor.beforeHandshake`, and `StompAuthChannelInterceptor.preSend`.
- Code path: the prior `/ws` endpoint used `setAllowedOriginPatterns("*")`. Its handshake interceptor copied an authenticated `sodam_web_sid` session into STOMP attributes, and the CONNECT interceptor accepted that session principal. Browser WebSocket requests do not carry the HTTP double-submit CSRF header.
- Attack conditions: a signed-in web-console user visits a page at an untrusted Origin that can cause the browser to send the matching session cookie—especially an attacker-controlled same-site Origin, because `SameSite=Strict` is site- rather than port-based. The request then opens `/ws` and sends STOMP CONNECT without a JWT. Native mobile clients are not affected because they use a JWT on CONNECT and normally have no Origin header.
- Impact: an untrusted browser Origin could establish the victim's authenticated STOMP session and attempt authorized store-topic subscriptions. Store membership is still checked at every subscription and payloads contain only change signals, so no REST authorization bypass or direct document-content disclosure was demonstrated.
- Verification: local code-path inspection confirmed the wildcard Origin policy and session-principal handoff. The new handshake regression proves an untrusted browser Origin is rejected, the configured console Origin is accepted, and the originless native-client path remains available for JWT authentication.
- Fix: `/ws` now uses the existing `sodam.session.csrf.allowed-origins` list in both Spring's endpoint Origin configuration and an explicit handshake interceptor. The Origin gate executes before the session security context is copied. No-Origin mobile handshakes still proceed to existing JWT validation at STOMP CONNECT.
- Added tests: `WebSocketOriginHandshakeInterceptorTest` (untrusted Origin denial, allowlisted Origin acceptance, originless mobile preservation).
- Post-fix verification: the new handshake tests and existing `StompAuthChannelInterceptorTest` pass locally.
- Residual risk: the full socket integration test was not completed in this follow-up because the local command wrapper stopped it at 64 seconds before it produced a test report. Production must set `SODAM_SESSION_CSRF_ALLOWED_ORIGINS` to only the actual web-console origins; a wildcard or an overly broad allowlist reintroduces this risk.

#### SEC-AUD-039 — deactivated employees could still create automatic attendance records (Medium)

- Related files/functions: `AttendanceService.checkIn`, `checkOut`, `checkInWithVerification`, `checkOutWithVerification`, `checkInWithNfcVerification`, `checkOutWithNfcVerification`, and `getEmployeeStoreContext`.
- Code path: self-only attendance controllers passed the authenticated employee and path store to the service. The service fetched an employee/store relation without requiring `isActive=true`; its GPS and NFC flows then called the common `checkIn`/`checkOut` methods, which created or changed records, notified owners, and produced payroll-relevant attendance.
- Attack conditions: a user has been deactivated or transferred out of a store but retains a valid token and is physically within the GPS radius or possesses/uses an active store NFC tag. The old inactive relation still exists for historical retention.
- Impact: a former employee could create new attendance, alter an open attendance with checkout, trigger owner notifications, and contaminate payroll/attendance evidence for the former store.
- Verification: `AttendanceServiceSecurityTest` supplied a real inactive relation through the service's repository boundary. Before the fix, `checkIn` reached the attendance repository rather than throwing, so the regression failed exactly at the expected access-denial assertion.
- Fix: the automatic GPS/NFC common check-in and checkout paths now require an active employee-store relation before any attendance repository operation. The master-only manual-registration path continues to use the historical relation lookup so an owner can correct pre-deactivation records.
- Added tests: `AttendanceServiceSecurityTest.inactiveEmployeeStoreRelationCannotCreateAutomaticAttendance`; the existing `AttendanceServiceTest.automaticAttendanceRejectsInactiveEmployeeStoreRelation` integration regression was also added but did not complete within the local wrapper limit.
- Post-fix verification: the focused service-security regression and existing `AttendanceControllerTest` pass locally. The common service guard covers both GPS and NFC because each automatic flow delegates to `checkIn` or `checkOut`.
- Residual risk: the full Spring attendance integration class did not produce a result before the 64-second local wrapper limit, so database-profile behavior and the explicit deactivated-checkout variation still need a completed integration run. This change intentionally does not block master historical manual corrections; those remain subject to master/store authorization.

#### SEC-AUD-040 — deactivated employees retained selected current-function access (Medium)

- Related files/functions: `StoreAuthorizationPolicy.assertActiveEmployeeInStore` and `assertActiveMemberOfStore`; `StoreAccessGuard`; `TimeOffController.createSelfTimeOffRequest`; `AttendanceIrregularityController.createNotice`; `EmployeeBreakRecordController.start` and `end`; `ShiftSwapController.list`; and `StompAuthChannelInterceptor.preSend`.
- Code path: those operations previously used a historical employee-store relation check. A relation is retained after deactivation for payroll, contracts, certificates, and corrections; it therefore satisfied the old check even though the person must no longer act as a current store employee or receive live store events.
- Attack conditions: a former employee retains a valid authenticated session or JWT after their relation has been made inactive. They submit a self-service time-off or attendance notice, start/end a break, request current swap listings, or subscribe to the store's STOMP topic.
- Impact: the former employee could create misleading current operational records and observe real-time store-change metadata. Historical document and record access was not broadened by this finding.
- Verification: focused controller and STOMP regressions were first changed to expect the active-membership guard. Before the patch, `TimeOffControllerTest.createSelfTimeOff_deniesInactiveEmployeeStoreRelation` and `StompAuthChannelInterceptorTest.subscribeToOtherStore_isDenied` failed because the old historical guards were called. Static call tracing confirmed the same historical guard on the other listed current-state paths.
- Fix: introduced narrow active-relation policy methods. Only current employee actions and live subscription/listing paths use them; historical self-data, owner manual attendance correction, contract/certificate/document retrieval, and their existing ownership checks remain unchanged.
- Added tests: `AttendanceIrregularityControllerSecurityTest`, `EmployeeBreakRecordControllerSecurityTest`, `ShiftSwapControllerSecurityTest`, the updated `TimeOffControllerTest`, `StompAuthChannelInterceptorTest`, and `StoreAuthorizationPolicyTest`.
- Post-fix verification: the combined local regression run completed with 0 failures across 47 tests, including the active-policy, attendance, controller, and STOMP paths. It also preserves master access through `assertActiveMemberOfStore`.
- Residual risk: this is deliberately not a global replacement of `assertEmployeeInStore`, because historical retention functions need it. The remaining historical-relation call sites require a per-operation decision before any future bulk change; the full authenticated WebSocket integration test remains incomplete under the local wrapper limit.

### Commands and results for this follow-up

| Command | Result |
|---|---|
| selected web-session, contract authority/cancellation/reissue, and document-security backend tests | PASS |
| `backend\gradlew.bat test --tests ExportServiceSecurityTest --offline --no-daemon` | PASS after the pre-fix regression failed as expected |
| `backend\gradlew.bat test --tests TossWebhookControllerSecurityTest --offline --no-daemon` | PASS: invalid signature is absent from logs; valid HMAC processing remains intact |
| `backend\gradlew.bat test --tests ExportServiceSecurityTest --tests TossWebhookControllerSecurityTest --offline --no-daemon` | PASS: combined regression run after all changes |
| `backend\gradlew.bat test --tests BreakRecordControllerSecurityTest --tests BreakRecordServiceTest --offline --no-daemon` | PASS by generated local reports: 14 tests, 0 failures; the command wrapper timed out after 64 seconds while Gradle completed normally |
| `backend\gradlew.bat test --tests SecurityRbacTest --offline --no-daemon` | PASS by generated local report: 19 tests, 0 failures; the command wrapper timed out after 64 seconds while Gradle completed normally |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.service.PasswordResetServiceSecurityTest --offline --no-daemon` | PASS: 3 OTP/reset-ticket digest regressions passed locally |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.controller.OnboardingControllerSecurityTest --tests com.rich.sodam.service.OnboardingServiceTest --offline --no-daemon` | PASS: cross-store onboarding lookup is denied and existing onboarding aggregation tests remain green |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.service.AppleAuthServiceTest --tests com.rich.sodam.controller.LoginControllerKakaoSecurityTest --offline --no-daemon` | PASS: Apple decoder diagnostics are redacted and existing login-security coverage remains green |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.exception.GlobalExceptionHandlerSecurityTest --offline --no-daemon` | PASS: validation and database-constraint responses retain 400/409 behavior without logging rejected secrets or duplicate values |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.controller.CertificateControllerSecurityTest --tests com.rich.sodam.security.web.SensitiveDownloadHeadersTest --tests com.rich.sodam.service.CertificateServiceTest --tests com.rich.sodam.controller.PayrollControllerTest --offline --no-daemon` | PASS after the certificate cache-header regression failed before the fix: the common download policy is non-storable, certificate issuance remains green, and payroll-controller behavior is retained |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.security.web.WebSocketOriginHandshakeInterceptorTest --tests com.rich.sodam.security.web.StompAuthChannelInterceptorTest --offline --no-daemon` | PASS: untrusted browser Origin is denied, configured Origin and originless JWT-client paths retain their expected behavior |
| `backend/`: `WebSocketDualAuthIntegrationTest` | NOT COMPLETED: the local command wrapper stopped the selected integration run at 64 seconds before it emitted a report; no pass/fail conclusion was taken from it |
| `backend/`: `.\gradlew.bat test --tests com.rich.sodam.service.AttendanceServiceSecurityTest --tests com.rich.sodam.controller.AttendanceControllerTest --offline --no-daemon` | PASS after the inactive-relation service regression failed before the fix: automatic attendance is denied and existing self-only controller behavior remains green |
| `backend/`: `AttendanceServiceTest.automaticAttendanceRejectsInactiveEmployeeStoreRelation` | NOT COMPLETED: the Spring integration context did not emit a result before the 64-second local wrapper limit; it is not treated as a pass |
| `backend/`: `./gradlew.bat test --tests AttendanceIrregularityControllerSecurityTest --tests EmployeeBreakRecordControllerSecurityTest --tests ShiftSwapControllerSecurityTest --tests TimeOffControllerTest --tests StompAuthChannelInterceptorTest --tests StoreAuthorizationPolicyTest --tests AttendanceServiceSecurityTest --offline --no-daemon` | PASS: 47 focused current-function/active-relation regressions completed with 0 failures |
| `backend/`: `./gradlew.bat build -x test --offline --no-daemon` | PASS: current source and test compilation completed after the active-relation and download/WebSocket changes |
| `backend/`: `./gradlew.bat test --tests WebSocketOriginHandshakeInterceptorTest --offline --no-daemon` | PASS: the final strict Origin normalization condition rejects untrusted origins while retaining configured and originless-client behavior |
| selected password-reset, onboarding, Apple-authentication, and global-exception security regressions | PASS: every selected local test class completed with 0 failures in the combined run |
| `backend/`: `.\gradlew.bat build -x test --offline --no-daemon` | PASS after the current account, onboarding, and log-redaction changes |
| `backend\gradlew.bat build -x test --offline --no-daemon` | PASS after the break-record and webhook changes |
| `backend\gradlew.bat test --tests PayrollControllerTest --tests PayrollHighRiskActionServiceTest --offline --no-daemon` | PASS |
| `frontend\node_modules\.bin\jest.cmd __tests__\utils\loggerSecurity.test.ts __tests__\utils\productionBabelSecurity.test.ts --runInBand` | PASS: raw Axios credentials are not passed to the logger and production Babel output removes the synthetic password/token |
| `web-master\npm run lint` | PASS |
| `web-master\node_modules\.bin\tsc.cmd --noEmit` | PASS |
| `git diff --check` | PASS: no whitespace errors (line-ending notices only) |

### Follow-up conclusion

- Verified fixed: local revoked-manager contract access, local pending delegated-contract processing, explicit sensitive-document, break-record, onboarding employee/store scope, active employee attendance scope, and deactivated-employee current-function scope; password-reset OTP keyed storage; CSV formula neutralization; payment/identity-token/validation log redaction; non-storable sensitive downloads; browser-Origin-gated web-session WebSockets; and BFF path/error hardening.
- Adjacent web/payroll revalidation: the current working tree's release logger removes raw error objects and all production console calls; idempotent payroll issue requests authorize the caller before replay lookup. The added regressions pass, so neither is an outstanding finding in this audit.
- Not treated as proven vulnerabilities: web UI-only route hiding, file-reference strings with no reader/uploader, and BFF cross-route injection (backend authorization prevents it).
- Remaining release action: add the signature provider's supported cancellation/expiry flow and verify it against a sanitized staging provider account; do not make a claim that provider-hosted pending requests disappear until that evidence exists.

### Function-level coverage and remaining work plan

The following is a coverage inventory, not a claim that unlisted paths are safe. “Reviewed” means the local authorization/input/data-flow path was traced in this session; it does not substitute for production or third-party verification.

| Priority | Function group | Current coverage | Remaining security work |
|---|---|---|---|
| P0 | Account, login, web session, password reset, consent, user profile | Web session/CSRF, login throttling, local token handling, Apple identity-token log redaction (SEC-AUD-035), password-reset OTP/ticket digesting (SEC-AUD-033), and sensitive profile update/export path reviewed. | Exercise every reset/consent/profile mutation with cross-account IDs and expired/revoked credentials in integration tests. |
| P0 | Store, employee, manager delegation, labor contract, e-signature, employee documents | Ownership and delegation revocation paths reviewed; SEC-AUD-026/027 fixed. | Re-run document/object authorization when a real uploader, reader, or signature-provider cancellation API is introduced. |
| P0 | Payroll, wage, bonus, tax order, subscription, payment webhook, CSV export | Payroll idempotency and calculation authority, bonus/tax/subscription ownership, webhook HMAC, and CSV injection reviewed; SEC-AUD-021/029/030 fixed. | Add provider-contract tests with sanitized stubs for refund, charge retry, webhook replay, and plan-change edge cases. |
| P0 | Attendance, correction, approval, irregularity, schedules, swaps, break records | Store/employee ownership, update locking, active automatic-attendance scope (SEC-AUD-039), and active current-function scope for time-off notice, break, swap, and STOMP paths (SEC-AUD-040) traced; SEC-AUD-031 fixed. | Complete inactive-employee checkout integration coverage; add API-level tests for all owner/manager/employee role combinations and concurrent duplicate requests. |
| P1 | Store operations: NFC, photos, setup, notices, daily sales, insights, statistics, query APIs | Daily sales, notice/template/shift/purchase paths were traced; photo/object serving was inspected statically. | Verify every store query/statistics/setup endpoint for cross-store resource IDs; test NFC replacement and photo upload/download against a local object-store emulator. |
| P1 | HR and compliance: time off, onboarding, amendments, minor labor, certificate, evidence, insurance filing, ledgers | Time-off, certificate/evidence/insurance membership checks, sensitive certificate cache controls (SEC-AUD-037), contract/document paths, and onboarding employee/store scope (SEC-AUD-034) reviewed. | Exercise amendment/ledger/overtime CRUD and verify access after employee deactivation or store transfer. |
| P1 | Recruitment and communications: job posting/application/offer/seeker, notifications, customer inquiries, referrals | Recruitment ownership, self-response paths, notification-token ownership, and referral/subscription reward paths were traced. | Add abuse-limit and enumeration tests for job search, inquiry submission, referral application, and device-token churn. |
| P2 | Admin/system content: campaign, legal/tax/labor/policy/qna/tip content, test utilities | Global-content mutation annotations and test-only profile isolation traced; SEC-AUD-032 fixed. | Verify content editor input/output encoding and attachments with malicious local files, then add profile-matrix tests for test-only routes. |
| P2 | Realtime, deployment, dependency and runtime hardening | STOMP store-topic authorization, session-WebSocket Origin gating (SEC-AUD-038), local configuration, and rejected-request log redaction (SEC-AUD-036) were reviewed; no external CVE lookup was performed. | Complete authenticated WebSocket subscribe/send integration tests, inspect CI secret handling, perform an offline SBOM/dependency review, and obtain approved network-based CVE results separately. |

### Unverified endpoint and CRUD inventory (current follow-up)

The local mapping index contains **75 controllers and 315 HTTP mapping methods**. The focused regressions above exercise selected high-risk paths; they do not constitute an API-level ownership, state-transition, and input-validation test for every mapping. Except for the explicitly named regressions in this report, the following controller groups still need an individual local cross-role CRUD matrix:

| Priority | Controller/function group not individually API-tested in this follow-up | Required local checks |
|---|---|---|
| P0 | `StoreController`, `MasterController`, `ManagerController`, `StoreQueryController`, `StoreSetupController`, `StorePhotoController`, `NfcTagController`, `StoreNoticeController` | For every create/update/delete and ID lookup: unrelated master, manager-without-permission, active employee, inactive employee, and another store must receive 403/404 as appropriate; test photo/NFC replacement races and object-key ownership. |
| P0 | Remaining `AttendanceController`, `AttendanceApprovalController`, `AttendanceCorrectionController`, `WorkShiftController`, `ShiftTemplateController`, `BreakRecordController`, `LegacyAttendanceProxyController` mappings | Cover each mutation with active/inactive relation, owner/manager permission, date/record ID from another store, duplicate/replayed request, and competing check-in/correction calls. |
| P0 | Remaining `PayrollController`, `WageController`, `MyWageController`, `PayrollBonusController`, `PayrollPolicyController`, `PayrollPreviewController`, `PayrollWizardController`, `PayrollAdvisoryController`, `TaxReportController`, `TaxStatementController`, `TaxServiceOrderController`, `SubscriptionController`, `PurchaseController`, `DailySalesController`, `ExportController` mappings | Assert server-side amount, tax, state, coupon/plan, order, and export-scope calculations; add replay/concurrency tests for all money- or payroll-state mutations and sanitized provider-stub tests. |
| P0 | Remaining `LaborContractController`, `ElectronicSignatureController`, `EmployeeDocumentController`, `EmploymentAmendmentController`, `OnboardingController`, `CertificateController`, `EvidencePackageController`, `InsuranceFilingController`, `LegalLedgerController` mappings | Execute cross-employee and post-deactivation/transfer reads and mutations; test document replacement/download content type, size, path, disposition, and object ownership against a local-only store. |
| P1 | `JobPostingController`, `JobApplicationController`, `JobOfferController`, `JobSeekerController`, `ReferralController`, `CustomerInquiryController`, `NotificationController` | Test requester ownership, enumeration resistance, status transitions, duplicate/replay limits, notification token replacement, and rate limits. |
| P1 | `LaborAggregationController`, `LaborRatioController`, `LaborRiskController`, `OvertimeLimitController`, `MinorLaborController`, `StoreStatsController`, `StoreInsightsController`, `HiringCostController`, `SubsidyController`, `TaxSimulatorController` | Verify every store/employee query parameter is authorized server-side, boundary dates are validated, and aggregate outputs never include another store's employee or wage data. |
| P2 | `CampaignController`, `LaborInfoController`, `PolicyInfoController`, `TaxInfoController`, `TipInfoController`, `QnaInfoController`, `TestController`, `TossWebhookController` | Test system-content mutation against the configured system-admin policy, stored-content output encoding/attachment safety, `test` profile isolation, and webhook timestamp/replay behavior using local fixtures. |
| P2 | Web console/BFF routes and frontend feature services | Add browser-session CSRF/origin, authorization-error redaction, route parameter, download-cache, and UI-to-server permission regression tests. Button visibility must never be treated as an authorization control. |

Planned execution order:

1. P0 store, attendance, labor-contract/document, and payroll mutation matrices, using two stores, an unrelated owner, an active employee, an inactive former employee, and a manager with one missing permission.
2. Local-only file/object-store emulator checks, then P1 HR/recruitment/analytics CRUD and bounded concurrency/rate-limit checks.
3. P2 system-content, test-profile, WebSocket integration, CI/secret configuration, and offline dependency/SBOM review.
4. Run the full backend test suite and all relevant frontend/web checks. Any timeout, skipped profile, or unavailable integration remains unverified rather than safe.

Execution order for the next audit cycle:

1. Add integration matrices for cross-account, cross-store, inactive employee, revoked manager, and replayed request variations across all remaining P0/P1 mutations.
2. Test file/object authorization with local-only storage and malicious MIME/content/path variants before enabling any public object mapping.
3. Audit admin/system CRUD and test-profile exposure, then test STOMP authorization and rate-limit behavior under bounded local concurrency.
4. Perform approved dependency/CVE and sanitized staging-provider checks, followed by a conclusive full backend/frontend CI run.

## 2026-07-30 residual remediation and quantified assessment

Scope: current repository and local test/build environment only. Excluded: production servers and data, real users, third-party requests, deployment, push, commit, and destructive operations.

### Project security structure

- Spring Boot API: JWT, server-side store/employee authorization policy, Redis-backed token/session paths, Flyway/MySQL in production.
- React Native: Axios API client, Android native Keystore bridge for sensitive local storage; no third-party secure-storage package was added.
- External integrations (Kakao, Toss, SMTP, FCM, S3) were inspected only; none were called.

### Finding summary

| ID | Severity | Status | Summary |
|---|---:|---|---|
| SEC-AUD-019 | Medium | Fixed for Android; iOS fail-closed | AsyncStorage bearer tokens migrated to Android Keystore AES-GCM; legacy plaintext is removed. |
| SEC-AUD-020 | High | Fixed | Production logging could retain raw Axios credentials/PII. Release bundles now strip all console calls; central logger drops raw objects. |
| SEC-AUD-021 | Medium | Fixed | Payroll idempotency replay now authorizes actor before returning a payroll DTO. |
| SEC-AUD-022 | High | Fixed | Production PII encryption now requires a Base64 32-byte AES-256 key and fails startup otherwise. |
| SEC-AUD-023 | High | Fixed for new writes; backfill outstanding | Birth date now has AES-GCM conversion and V71 column migration. Historic rows remain a controlled data task. |
| SEC-AUD-024 | Medium | Fixed | Rate-limit bucket maps are bounded/expiring; XFF is accepted only from configured direct proxy IPs. |
| SEC-AUD-025 | Medium | Fixed for Android; iOS fail-closed | Offline attendance GPS queue moved out of AsyncStorage and is removed at logout. |

### Detailed findings

#### SEC-AUD-020 — release log credential exposure (High)

- Related files/functions: `frontend/babel.config.js`, `frontend/src/utils/logger.ts`, `frontend/src/features/auth/services/authService.ts`.
- Code path: failed login/signup/password-reset passed a raw Axios error to `logger.error`, while release Babel retained console error/warn calls.
- Attack conditions: access to device diagnostics/error collector after an authentication failure.
- Impact: password, reset ticket, Bearer header, email, or response PII could be logged.
- Verification: source path and production Babel regression test.
- Fix: remove every console call in release; central logger emits only formatted message/context.
- Added tests: `productionBabelSecurity.test.ts`, `loggerSecurity.test.ts`.
- Post-fix: transformed output contains neither synthetic password/token nor `console.error`.
- Residual risk: direct console calls are still visible in development builds; signed-release pipeline must retain this Babel policy.

#### SEC-AUD-021 — payroll idempotency authorization (Medium)

- Related files/functions: `PayrollController.issuePayroll`, `PayrollHighRiskActionService.authorizeIssueRequest`, `RequestIdempotencyService.executeOptional`.
- Code path: processed idempotency key replay evaluated `onReplay` before high-risk authorization.
- Attack conditions: authenticated actor knows/reuses a matching key inside its ten-minute TTL. First-party mobile currently does not send the optional header.
- Impact: payroll DTO disclosure (employee identity, wage, deduction, gross/net pay).
- Verification: controller regression checks a denial before idempotency service interaction.
- Fix: verify `PAYROLL_CONFIRM` authority and derive store scope before replay lookup.
- Added tests: `PayrollControllerTest.issuePayroll_deniedBeforeIdempotentReplay`.
- Post-fix: denied actor has no idempotency-service interaction.
- Residual risk: future generic idempotency callers must also authorize before replay.

#### SEC-AUD-022/023 — PII key and birth-date encryption (High)

- Related files/functions: `PiiCryptoKeyHolder`, `LocalDateCryptoConverter`, `User.birthDate`, `V71__encrypt_user_birth_date.sql`.
- Code path: production derived encryption from arbitrary text; birth date used a plaintext DATE column.
- Attack conditions: weak prod key configuration or database/backup read access.
- Impact: predictable encryption or plaintext birth-date disclosure.
- Verification: local crypto tests cover prod-key rejection/acceptance, ciphertext round-trip, legacy plaintext read.
- Fix: prod fail-fast AES-256 key validation and AES-GCM date converter into VARCHAR.
- Added tests: `PiiCryptoKeyHolderTest`, `LocalDateCryptoConverterTest`.
- Post-fix: local tests pass.
- Residual risk: historic rows, V68 PII rows, backups were not accessed/changed; controlled backfill is mandatory.

#### SEC-AUD-019/025 — mobile at-rest secrets and GPS (Medium)

- Related files/functions: `tokenStore`, `secureTokenStorage`, Android `SecureTokenStorageModule`, `offlineAttendanceQueue`, `authService.logout`.
- Code path: bearer credentials/GPS queue were written through `unifiedStorage` to AsyncStorage.
- Attack conditions: rooted/jailbroken device, filesystem extraction, or backup/diagnostic access.
- Impact: session theft or precise employee/store GPS disclosure.
- Verification: Jest tests assert no legacy AsyncStorage writes; Android Kotlin compiler passed.
- Fix: Android Keystore AES-GCM bridge, legacy deletion, logout purge, memory-only fallback without a native secure store.
- Added tests: `tokenManager.test.ts`, `offlineAttendanceQueue.test.ts`.
- Post-fix: full frontend Jest suite and Android Kotlin compile pass.
- Residual risk: iOS has no Keychain bridge yet. It persists nothing (secure fail-closed), but automatic re-login/offline queue persistence needs native iOS work and macOS/iOS validation.

#### SEC-AUD-024 — rate-limit resource and proxy trust (Medium)

- Related files/functions: `RateLimitFilter`, `application.yml`, `.env.example`.
- Code path: buckets never expired and forwarded headers could be trusted without verifying proxy peer.
- Attack conditions: many distinct source identities or untrusted XFF header access when forwarded-header trust enabled.
- Impact: heap growth or rate-limit identity spoofing.
- Verification: bound, untrusted-XFF, and trusted-proxy regression tests.
- Fix: idle TTL, per-policy maximum, exact direct-proxy allowlist.
- Added tests: `RateLimitFilterTest` cases.
- Post-fix: targeted backend tests pass.
- Residual risk: limiter remains per-instance; a multi-node deployment needs distributed limiting and an accurate proxy list.

### Modified files

- Backend: `RateLimitFilter`, `PiiCryptoKeyHolder`, `LocalDateCryptoConverter`, `PayrollController`, `PayrollHighRiskActionService`, `User`, V71 migration, backend tests, `application.yml`.
- Frontend: secure storage bridge and Android package, token/GPS queue migration, auth logout purge, logger/Babel policy, STOMP idle cleanup, frontend tests.
- Configuration: `.env.example` trusted-proxy settings.

### Commands and results

| Command | Result |
|---|---|
| `backend\gradlew.bat test --tests PiiCryptoKeyHolderTest --tests LocalDateCryptoConverterTest --tests PayrollControllerTest --tests RateLimitFilterTest --offline --no-daemon` | PASS |
| `frontend\node_modules\.bin\jest.cmd --runInBand` | PASS: 84 passed / 4 skipped suites; 473 passed / 10 skipped tests |
| `frontend\node_modules\.bin\tsc.cmd --noEmit` | PASS |
| `frontend\npm run lint` | PASS: 0 errors, 1,037 pre-existing warnings |
| `frontend\android\gradlew.bat :app:compileDebugKotlin --offline --no-daemon` | PASS |
| `backend\gradlew.bat build -x test --offline --no-daemon` | PASS |
| `git diff --check` | PASS: no whitespace errors (only repository line-ending notices) |

### Unexecuted checks and reasons

- Production PII migration/backfill, backup cleanup, real mobile E2E, iOS build: production/real data or macOS/iOS access is outside scope.
- Full backend suite: prior local run did not finish conclusively; do not interpret it as a pass.
- Dependency/CVE network lookup and third-party integrations: excluded from scope.

### Quantified assessment

- Code security posture: **82/100**.
- Release assurance: **64/100**.
- No software can truthfully be guaranteed unbreakable. These scores apply only to the verified local evidence and are intentionally lower for unverified production data/platform work.

### Remaining findings and required release actions

- Critical: **0**
- High: **0** in tested code; historic data stays release-blocking until V68/V71 backfill is verified.
- Medium: **2** — historic plaintext PII/backups; per-instance rate limit for a multi-node deployment.
- Low: **1** — historical raw refresh/reset values in retained data copies are non-authenticating but require retention cleanup.

Before release: test V68/V71 and resumable backfill on sanitized staging, verify zero plaintext rows and backup/restore/key rotation; purge legacy sensitive backups/logs; add/test iOS Keychain; configure proxy/CORS/CSRF/PII key; use distributed rate limit if scaled; obtain conclusive full CI suites.

**Final assessment: CONDITIONAL PASS.**

- 감사일: 2026-07-30
- 최종 판정: **CONDITIONAL PASS**
- 범위: 현재 로컬 저장소와 로컬 테스트 환경만. 운영 서버, 실제 사용자 데이터, 제3자 API, 배포, push, commit은 사용하지 않았다.
- 제외: 외부 CVE DB 조회(`npm audit` 등), 실제 Kakao/SMTP/Toss/S3 호출, 운영 MySQL/Flyway 적용, 실제 업로드 저장소, Android 에뮬레이터 E2E.

## 프로젝트 보안 구조

- Backend: Spring Boot 3.4.5 / Java 17, JWT stateless API와 별도 웹 콘솔 세션 체인.
- 권한: `UserPrincipal`의 토큰 주체와 `StoreAuthorizationPolicy`가 매장 소유·직원 소속·본인 여부를 검사한다.
- 데이터: prod는 MySQL/Flyway, Redis는 JWT/cache와 OAuth state에 사용한다. test/dev는 H2 및 메모리 대체 구현을 사용한다.
- Frontend: React Native. 카카오 로그인은 앱 deep link, 토큰은 로컬 스토리지, API는 Axios client를 통해 호출한다.
- 외부 연동: Kakao OAuth/지오코딩, SMTP, Toss, FCM, S3가 설정 기반으로 활성화된다. 이번 감사에서는 호출하지 않았다.

## 기존 상태 보존

- 감사 시작 전 변경: `frontend/src/features/auth/components/PurposeSelectModal.tsx` 삭제와 여러 untracked 로컬 산출물/스크립트가 있었다. 관련 파일을 되돌리거나 수정하지 않았다.
- 시작 전 검증: backend `gradlew.bat test` 통과, frontend lint는 오류 0·경고 1030개, frontend unit test는 통과 상태였다.

## 발견 사항 요약

| ID | 위험도 | 상태 | 요약 |
|---|---|---|---|
| SEC-AUD-001 | Critical | 수정 | 전역 MASTER가 임의 개인 사용자 리소스를 읽거나 변경 가능 |
| SEC-AUD-002 | Critical | 수정 | 레거시 출퇴근 API가 요청의 `employeeId`를 호출자와 대조하지 않음 |
| SEC-AUD-003 | Critical | 수정 | 증거 패키지가 매장 밖 직원의 급여·개인정보를 조회 가능 |
| SEC-AUD-004 | Critical | 수정 | 전역 MASTER가 임의 `/api/user/{userId}` PII를 조회 가능 |
| SEC-AUD-005 | High | 수정 | Kakao OAuth state가 서버 발급·일회성 검증되지 않아 login CSRF 가능 |
| SEC-AUD-006 | High | 수정 | refresh/reset bearer credential이 DB에 평문 저장 |
| SEC-AUD-007 | High | 수정 | 개인 근무지·고객 문의 PII가 평문 저장 |
| SEC-AUD-008 | High | 수정 | OTP, 이메일, 주소·좌표, 토큰 일부가 로그에 남을 수 있음 |
| SEC-AUD-009 | High | 수정 | prod compose가 알려진 기본 시크릿과 mock mail로 기동 가능 |
| SEC-AUD-010 | High | 수정 | prod CORS가 localhost 개발 origin을 credentials와 함께 허용 |
| SEC-AUD-011 | Medium | 수정 | 매장 STOMP 토픽 SUBSCRIBE에 매장 소속 검사 없음 |
| SEC-AUD-012 | Medium | 수정 | 지오코딩 실패/응답 로그에 주소·좌표가 남음 |
| SEC-AUD-013 | Medium | 수정 | 미성년 근로 보호 조회가 대상 직원의 매장 소속을 확인하지 않음 |

## 상세 결과

### SEC-AUD-001 — Critical — 개인 사용자 IDOR

- 관련 파일과 함수: `personal/controller/PersonalUserController.java`, `verifyAccess`.
- 문제의 코드 경로: 모든 `/api/personal-users/{userId}` 경로가 토큰 주체가 달라도 `ROLE_MASTER`면 통과했다.
- 필요한 공격 조건: 다른 매장 소유 MASTER의 유효 JWT와 대상 userId.
- 예상 영향: 개인 프로필, 근무지, 세무·출퇴근 정보를 교차 매장 조회·변경.
- 검증 결과: 회귀 테스트를 기존 구현에 적용했을 때 403이 아닌 서비스 호출 경로가 확인됐다.
- 수정 내용: 역할 예외를 제거하고 토큰 주체 자신만 허용했다.
- 추가한 테스트: `PersonalUserControllerTest`의 타인 userId 403 및 서비스 미호출 검증.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 없음.

### SEC-AUD-002 — Critical — 레거시 출퇴근 대리 기록

- 관련 파일과 함수: `controller/LegacyAttendanceProxyController.java`, `legacyCheckIn`, `legacyCheckOut`.
- 문제의 코드 경로: 요청 body의 `employeeId`를 그대로 출퇴근 서비스에 전달했다.
- 필요한 공격 조건: 로그인한 직원이 다른 직원 ID와 유효한 위치 입력을 전송.
- 예상 영향: 타인 출퇴근·급여 원장 변조.
- 검증 결과: 현대 `/api/attendance` 경로와 달리 레거시 프록시에 본인 가드가 없었다.
- 수정 내용: `StoreAuthorizationPolicy.assertSelf`를 서비스 호출 전에 추가했다.
- 추가한 테스트: `LegacyAttendanceProxyControllerTest`의 check-in/check-out 타인 ID 거부.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 위치 검증의 정확도는 별도 도메인 정책 범위다.

### SEC-AUD-003 — Critical — 증거 패키지 교차 매장 급여 노출

- 관련 파일과 함수: `EvidencePackageController.evidence`, `EvidencePackageService.payrollSummary`, `PayrollRepository`.
- 문제의 코드 경로: 요청 매장 소유만 확인한 뒤 전역 `employeeId` 급여 조회를 수행했다.
- 필요한 공격 조건: 아무 매장이나 소유한 MASTER가 다른 매장 직원 ID를 지정.
- 예상 영향: 타 매장 급여·공제·근무 증거와 PII 노출.
- 검증 결과: 사전 회귀 테스트가 기존 구현에서 실패했다.
- 수정 내용: 대상 직원의 요청 매장 소속을 검사하고 급여 repository query에 `storeId` 조건을 추가했다.
- 추가한 테스트: `EvidencePackageControllerTest`, `EvidencePackageServiceTest`.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 없음.

### SEC-AUD-004 — Critical — 전역 MASTER 사용자 PII 조회

- 관련 파일과 함수: `controller/UserController.getUserById`.
- 문제의 코드 경로: 전역 `ROLE_MASTER`만으로 `/api/user/{userId}`를 허용했다.
- 필요한 공격 조건: 다른 매장 MASTER의 JWT와 대상 userId.
- 예상 영향: 이메일, 전화번호, 생년월일, 동의 상태 등 `UserResponseDto` PII 노출.
- 검증 결과: `hasManagerRole`이 매장 관계 없이 참이었다.
- 수정 내용: 타인 조회 시 `assertCanViewEmployee(principalId, userId, isMaster)`를 try 밖에서 강제했다.
- 추가한 테스트: `UserControllerTest`의 교차 매장 MASTER 차단.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 사용자 ID와 직원 프로필 ID의 도메인 매핑 변경 시 이 권한 계약을 함께 검토해야 한다.

### SEC-AUD-005 — High — Kakao login CSRF

- 관련 파일과 함수: `LoginController`, `KakaoAuthService`, `KakaoOAuthStateService`, `KakaoLoginScreen`, auth API/service/hook/context.
- 문제의 코드 경로: `/kakao/auth/proc`가 없거나 임의의 state를 경고만 남기고 code 교환했다.
- 필요한 공격 조건: 공격자 자신의 Kakao authorization code callback URL을 피해 앱/브라우저로 유도.
- 예상 영향: 피해자가 공격자 계정으로 로그인되어 오입력·개인정보 혼선 발생.
- 검증 결과: 서버 저장 state 및 client callback 대조가 없고 frontend authorization URL도 state를 넣지 않았다.
- 수정 내용: 서버가 Redis(prod)/in-memory(dev,test)에 5분 TTL, 1회성 state+PKCE verifier digest를 저장한다. callback은 state와 `X-Kakao-OAuth-Code-Verifier`가 모두 일치해야 code exchange를 수행하며, client는 일치하는 pending transaction만 처리한다.
- 추가한 테스트: `KakaoOAuthStateServiceTest`, `LoginControllerKakaoSecurityTest`, frontend `kakaoLoginScreen.test.ts`의 일치·불일치·cold-start 경로.
- 수정 후 검증 결과: 재사용/불일치/missing state가 차단되고 정상 pending state callback 테스트가 통과했다.
- 남은 위험: Kakao 실제 앱 등록의 PKCE 지원·redirect URI 조합은 외부 호출 금지로 E2E 미검증이다.

### SEC-AUD-006 — High — bearer token 평문 저장

- 관련 파일과 함수: `RefreshToken`, `RefreshTokenService`, `RefreshTokenRepository`, `PasswordResetToken`, `PasswordResetService`, repository들, `BearerTokenHasher`.
- 문제의 코드 경로: refresh token과 password-reset ticket이 DB unique column에 원문으로 저장·조회됐다.
- 필요한 공격 조건: DB read 권한 또는 백업 유출.
- 예상 영향: 활성 refresh token(최대 7일) 또는 reset ticket(최대 5분) 재사용을 통한 계정 탈취.
- 검증 결과: entity의 token/reset ticket 원문 저장과 exact-value repository lookup을 확인했다.
- 수정 내용: `jwt.secret` 기반 HMAC-SHA-256 digest만 저장하고, 입력 bearer 값도 같은 digest로 조회한다. raw 값은 발급 응답 직전 메모리에만 둔다.
- 추가한 테스트: `RefreshTokenServiceSecurityTest`, `PasswordResetServiceSecurityTest`.
- 수정 후 검증 결과: 저장값이 raw와 다르고 digest lookup만 수행됨을 검증했다. 기존 raw DB 행은 새 lookup으로 인증되지 않는다.
- 남은 위험: 이미 존재하는 raw 값은 만료/정리 전 DB·백업에는 남는다.

### SEC-AUD-007 — High — PII 평문 저장

- 관련 파일과 함수: `personal/domain/PersonalWorkplace`, `domain/CustomerInquiry`, `IntegerCryptoConverter`, `V68__encrypt_personal_workplace_and_customer_inquiry_pii.sql`.
- 문제의 코드 경로: 근무지 이름·주소·시급과 고객 문의 이름·이메일·본문에 암호화 converter가 없었다.
- 필요한 공격 조건: DB 또는 백업 읽기 권한.
- 예상 영향: 개인 근무·임금·문의 PII 원문 노출.
- 검증 결과: 해당 entity column에 `StringCryptoConverter`가 적용되지 않은 것을 확인했다.
- 수정 내용: 문자열은 AES-GCM converter, 시급은 새 Integer converter로 암호화하고 ciphertext 길이를 위한 Flyway V68 컬럼 확장을 추가했다.
- 추가한 테스트: `SensitiveDomainPiiEncryptionTest`.
- 수정 후 검증 결과: 민감 필드 converter 선언과 시급 ciphertext round-trip 테스트가 통과했다.
- 남은 위험: 기존 평문 행은 안전한 별도 backfill 전까지 평문이다.

### SEC-AUD-008 — High — 민감 로그 및 mock OTP 노출

- 관련 파일과 함수: `GeocodingService`, `MockEmailSender`, `SmtpEmailSender`, `MockPushNotifier`, `LivePushNotifier`, `CustomUserDetailsService`, `KakaoAuthService`, JWT classes, `LoginController`.
- 문제의 코드 경로: 주소·좌표, OAuth 이메일, OTP·메일 본문, 알림 본문, token 일부가 로그 인자였다.
- 필요한 공격 조건: 애플리케이션 로그 읽기 권한.
- 예상 영향: PII, 위치, 인증 비밀 유출.
- 검증 결과: mock mail sender가 reset OTP를 INFO로 기록했고 geocoding이 응답 본문·주소를 기록했다.
- 수정 내용: raw 값·본문·예외 메시지 로그를 제거하고 userId, 유형, count, masked recipient만 기록하게 했다.
- 추가한 테스트: `GeocodingServiceTest`, `MockEmailSenderSecurityTest`.
- 수정 후 검증 결과: 주소·좌표 및 OTP·원문 이메일이 로그에 없음을 검증했다.
- 남은 위험: 기존 배포 로그 보존본은 본 패치로 삭제되지 않는다.

### SEC-AUD-009 — High — compose prod known/default secret 및 mock mail

- 관련 파일과 함수: `docker-compose.yml`, `.env.example`, `IntegrationProperties`, `SmtpEmailSender`.
- 문제의 코드 경로: prod compose가 알려진 JWT/PII/DB 기본값 및 기본 mock mail 설정으로 기동 가능했다.
- 필요한 공격 조건: 누락된 환경변수로 compose 실행.
- 예상 영향: JWT 위조, PII 키 노출, DB 접근 또는 reset OTP 로그 노출.
- 검증 결과: 구성 파일의 interpolation default 및 mail mode default를 확인했다.
- 수정 내용: DB/JWT/PII/pepper/SMTP host/from을 compose required interpolation으로 바꾸고 prod compose mail mode를 live로 고정했다.
- 추가한 테스트: local `docker compose config --quiet` missing-secret reject 및 dummy-value accept 검증.
- 수정 후 검증 결과: 필수 값 미설정은 거부, 비밀이 아닌 검증용 값을 명시하면 config가 통과했다.
- 남은 위험: 실제 SMTP/TLS/DKIM 구성은 운영 배포 전 별도 검증이 필요하다.

### SEC-AUD-010 — High — prod CORS localhost credential 허용

- 관련 파일과 함수: `config/WebConfig`.
- 문제의 코드 경로: 활성 프로필과 무관하게 localhost/Metro origin이 `/api/**`에 credentials와 함께 허용됐다.
- 필요한 공격 조건: 사용자 장비의 허용된 localhost origin에서 악성 웹 콘텐츠 실행 및 유효 cookie/session 조건.
- 예상 영향: 브라우저 기반 교차 출처 요청 위험 확대.
- 검증 결과: `DEV_ORIGINS`가 무조건 `CorsConfiguration`에 추가됐다.
- 수정 내용: dev/test에서만 개발 origin을 추가하고 prod는 `SODAM_CORS_ALLOWED_ORIGINS`의 명시 origin만 사용한다.
- 추가한 테스트: `WebConfigSecurityTest`.
- 수정 후 검증 결과: prod localhost 거부 및 명시 origin 허용, dev localhost 허용을 검증했다.
- 남은 위험: prod 배포 시 실제 web console origin을 반드시 환경변수에 넣어야 한다.

### SEC-AUD-011 — Medium — STOMP store topic BOLA

- 관련 파일과 함수: `security/web/StompAuthChannelInterceptor`, `WebSocketConfig`.
- 문제의 코드 경로: CONNECT만 인증하고 `/topic/store.{storeId}` SUBSCRIBE의 store membership을 확인하지 않았다.
- 필요한 공격 조건: 유효 JWT/웹 세션으로 STOMP 연결 후 다른 store topic 구독.
- 예상 영향: 매장 변경 이벤트 metadata 노출 및 polling 유도.
- 검증 결과: interceptor가 CONNECT 외 command를 무조건 통과시켰다.
- 수정 내용: store topic SUBSCRIBE마다 principal ID와 destination storeId로 `assertMemberOfStore`를 실행한다.
- 추가한 테스트: `StompAuthChannelInterceptorTest`.
- 수정 후 검증 결과: 비소속 store subscription이 거부된다.
- 남은 위험: native/web 실제 broker E2E는 이번 로컬 단위 검증 범위 밖이다.

### SEC-AUD-012 — Medium — 지오코딩 위치 로그

- 관련 파일과 함수: `service/GeocodingService.liveGeocode`, `mockGeocode`.
- 문제의 코드 경로: Kakao 응답 객체, 입력 주소, 위도·경도를 debug/warn/error에 남겼다.
- 필요한 공격 조건: 로그 읽기 권한 및 지오코딩 요청 발생.
- 예상 영향: 매장·구직 희망지 위치 PII 노출.
- 검증 결과: 사전 회귀 테스트가 raw address log 때문에 실패했다.
- 수정 내용: document count와 실패 class만 기록하고 외부 오류/사용자 메시지에서 주소를 제거했다.
- 추가한 테스트: `GeocodingServiceTest.liveGeocode_doesNotWriteAddressOrCoordinatesToLogs`.
- 수정 후 검증 결과: 테스트 통과.
- 남은 위험: 기존 로그 보존본은 별도 로그 보존 정책으로 처리해야 한다.

### SEC-AUD-013 — Medium — 미성년 근로 보호 정보 교차 매장 조회

- 관련 파일과 함수: `controller/MinorLaborController.minorGuard`.
- 문제의 코드 경로: master store ownership만 검사하고 target employee의 해당 매장 소속을 확인하지 않았다.
- 필요한 공격 조건: 다른 매장을 소유한 MASTER와 대상 employeeId.
- 예상 영향: 연령·보호자·야간근로 관련 민감 정보 추론.
- 검증 결과: 사전 회귀 테스트가 기존 구현에서 실패했다.
- 수정 내용: 서비스 호출 전 `assertEmployeeInStore`를 추가했다.
- 추가한 테스트: `MinorLaborControllerTest`.
- 수정 후 검증 결과: 대상 보안 테스트 통과.
- 남은 위험: 없음.

## 수정한 파일

- 인가/인증: `UserController`, `PersonalUserController`, `LegacyAttendanceProxyController`, `EvidencePackageController`, `MinorLaborController`, `LoginController`, OAuth state store/service, STOMP interceptor, frontend Kakao auth 경로.
- 데이터/비밀: refresh/reset token entities·repositories·services, encrypted PII entities/converter, V68 migration, compose 및 `.env.example`.
- 로그/CORS: geocoding, mail/push/JWT/auth logging, `WebConfig`.
- 테스트: controller/service/config/frontend 회귀 테스트를 추가·갱신했다.

## 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `backend\gradlew.bat test` (시작 전) | 통과 |
| 선택 보안 테스트 묶음 | 통과 |
| `backend\gradlew.bat test` (수정 후 전체) | Gradle 출력은 `BUILD SUCCESSFUL`이나 실행 래퍼가 181.8초에 timeout(124)을 반환; 깨끗한 종료 코드로 확정하지 않음 |
| `backend\gradlew.bat build -x test` | 통과 |
| `frontend\npx jest __tests__/auth/kakaoLoginScreen.test.ts --runInBand` | 1 suite, 8 tests 통과 |
| `frontend\npm run test:unit` | 80 suites, 461 tests 통과; 기존 STOMP worker/timer 종료 경고 존재 |
| `frontend\npx tsc --noEmit` | 통과 |
| `frontend\npm run lint` | 오류 0, 기존 경고 1030개 |
| `docker compose config --quiet` | 필수 secret 누락 거부, 명시한 dummy validation 값은 통과 |
| `git diff --check` | 통과 |

## 미실행 검사와 이유

- 실제 Kakao/SMTP/Toss/S3/FCM 호출: 제3자 시스템 요청 금지 범위.
- 운영 DB migration/backfill: 운영 접근·실제 데이터 변경 금지 범위.
- CVE 온라인 조회 및 패키지 업데이트: 외부 요청·무관한 전체 의존성 업그레이드 금지 범위.
- Android emulator E2E: 인증 flow의 외부 Kakao callback이 필요하고 이번 범위를 벗어난다.
- MySQL에서 V68 실제 적용: 기존 로컬 Docker 볼륨을 변경하지 않기 위해 미실행.

## 남은 위험

- Critical: 0
- High: 0
- Medium: 1 — V68 적용 전 기존 PII 행은 평문이며, 본 변경은 안전을 위해 자동 대량 backfill을 하지 않는다.
- Low: 1 — 기존 refresh/reset raw column 값은 새 hash lookup으로 인증되지 않지만 만료·보존 전 DB/백업에 남는다.

## 배포 전 필수 조치

1. MySQL 백업 후 V68 적용을 스테이징에서 검증하고, 승인된 별도 배치로 기존 PII ciphertext backfill을 수행한다.
2. 기존 refresh token을 만료 또는 폐기하고, backup/log retention 정책으로 historic raw token·OTP·주소 로그를 정리한다.
3. `SODAM_JWT_SECRET`, PII key/pepper, DB password, SMTP host/from 및 실제 CORS origin을 secret manager/environment에 명시한다.
4. Kakao 등록 콘솔에서 redirect URI와 PKCE code challenge flow를 스테이징 앱으로 E2E 검증한다.
5. CI에서 backend 전체 테스트가 wrapper timeout 없이 0으로 종료되는지 재실행하고, frontend STOMP open-handle 경고를 별도 정리한다.

---

## 2026-07-30 보충 감사 및 수정 결과

위의 기존 로컬 감사 기록은 보존했다. 이 절은 그 뒤 현재 작업 트리에서 다시 확인한 코드 경로, 추가한 회귀 테스트, 그리고 이번에 적용한 최소 범위 수정만 기록한다. 운영 서버·실제 데이터·외부 연동에는 접근하거나 요청을 보내지 않았다.

### 보충 발견 사항 요약

| ID | 위험도 | 상태 | 요약 |
|---|---|---|---|
| SEC-AUD-014 | Medium | 수정·회귀 테스트 통과 | 매장 소유자 역할을 전역 안내 콘텐츠 운영 권한으로 오인 |
| SEC-AUD-015 | High | 수정·구성 검증 통과 | MySQL·Redis·세션 Redis·Adminer가 모든 인터페이스에 게시됨 |
| SEC-AUD-016 | Medium | 수정·회귀 테스트 통과 | 출퇴근 사전 위치/NFC 검증이 매장 소속을 확인하지 않음 |
| SEC-AUD-017 | Medium | 수정·회귀 테스트 통과 | 로그인 rate-limit 키를 쿼리 이메일로 무한 분할 가능 |
| SEC-AUD-018 | Low | 수정·단위 테스트 통과 | Toss 결제 식별자와 공급자 오류 본문이 로그로 유출될 수 있음 |
| SEC-AUD-019 | Medium | 미수정·배포 전 조치 필요 | React Native access/refresh token이 AsyncStorage에 평문 저장됨 |

### SEC-AUD-014 — Medium — 전역 콘텐츠 운영 권한 혼동

- **관련 파일과 함수:** `UserController.convertToOwner`, `LaborInfoController`, `PolicyInfoController`, `TaxInfoController`, `TipInfoController`, `QnaInfoController`의 쓰기 API, 새 `SystemContentAdminAuthorizer.canManage`.
- **문제 코드 경로:** 일반 사용자가 본인 계정을 매장 소유자(`MASTER`)로 전환한 뒤, `@MasterOnly`만 요구하던 전역 노무·세무·정책·팁·Q&A 콘텐츠의 생성·수정·삭제 API를 호출할 수 있었다. 매장 소유권은 시스템 운영 권한의 근거가 아니다.
- **필요한 공격 조건:** 유효한 일반 사용자 계정과 자기 계정의 소유자 전환 API 호출 권한.
- **예상 영향:** 모든 사용자에게 노출되는 전역 안내 콘텐츠의 무단 변조. 결제·개인정보 직접 접근 경로는 확인하지 못했으므로 Medium으로 분류했다.
- **검증 결과:** 수정 전 `SecurityRbacTest`에서 허용 목록 밖 `ROLE_MASTER`가 `POST /api/tip-info`에 실제로 200을 받아 재현됐다.
- **수정 내용:** `SystemContentAdminOnly`와 서버 설정 기반 allowlist를 추가했다. `SODAM_SECURITY_SYSTEM_CONTENT_ADMIN_USER_IDS`가 비어 있으면 실패 폐쇄하며, 클라이언트가 보낸 역할·ID가 아니라 인증된 `UserPrincipal`의 서버 측 ID만 검사한다.
- **추가한 테스트:** allowlist 밖 MASTER의 403과 allowlist 안 `UserPrincipal(1)`의 정상 생성 200을 `SecurityRbacTest`에 추가했다. 기존 정상 쓰기 테스트는 `LaborInfoIntegrationTest`에서 설정된 시스템 운영자 principal을 사용하도록 조정했다.
- **수정 후 검증 결과:** 관련 회귀 테스트가 통과했다. 정상 운영자 쓰기와 일반 매장 소유자 차단을 모두 확인했다.
- **남은 위험:** 배포 시 실제 시스템 콘텐츠 운영자 ID를 환경 변수로 지정해야 한다. 누락 시 의도대로 모든 전역 쓰기가 차단된다.

### SEC-AUD-015 — High — Docker Compose 관리용 데이터 서비스 공개

- **관련 파일과 함수:** 루트 `docker-compose.yml`의 `mysql`, `redis`, `session-redis`, `adminer` 포트 매핑.
- **문제 코드 경로:** 암호·ACL이 없는 Redis 및 세션 Redis와 DB 관리 도구가 호스트의 모든 네트워크 인터페이스로 게시될 수 있었다.
- **필요한 공격 조건:** Compose를 실행한 호스트의 해당 포트에 신뢰할 수 없는 네트워크 경로가 존재해야 한다.
- **예상 영향:** 직접 Redis 접근을 통한 캐시/세션 조작, 데이터베이스 공격면 확대, 관리 도구 접근. 네트워크 노출 하나로 재현 가능한 인프라 취약점이므로 High로 분류했다.
- **검증 결과:** 수정 전 Compose 설정에서 네 포트가 인터페이스 미지정 방식으로 게시되는 것을 확인했다.
- **수정 내용:** 네 포트를 모두 `127.0.0.1:`에만 바인딩했다. 백엔드와 웹의 의도된 서비스 포트는 변경하지 않았다.
- **추가한 테스트:** `docker compose config --no-interpolate`로 생성된 포트 매핑을 확인했다.
- **수정 후 검증 결과:** MySQL `13306`, Redis `16379`, 세션 Redis `16380`, Adminer `18080`이 모두 `127.0.0.1` 바인딩으로 출력됐다.
- **남은 위험:** 외부 DB/Redis 접속이 사업상 필요하면 public 포트 매핑을 되돌리지 말고, 사설망·방화벽·Redis AUTH/TLS/ACL을 별도 구성해야 한다. 실제 Docker 기동은 기존 로컬 볼륨을 보존하기 위해 하지 않았다.

### SEC-AUD-016 — Medium — 출퇴근 사전 검증의 매장 소속 누락

- **관련 파일과 함수:** `AttendanceController.verifyLocation`, `AttendanceController.verifyNfc`.
- **문제 코드 경로:** 인증된 사용자가 body의 `storeId`를 바꿔 타 매장의 위치 반경 거리나 활성 NFC 태그 유효성 정보를 조회할 수 있었다. 실제 check-in/check-out 경로의 본인 검증과는 별개의 사전 검증 API였다.
- **필요한 공격 조건:** 유효한 직원 또는 매장 소유자 JWT와 추측 가능한 다른 매장 ID.
- **예상 영향:** 타 매장 위치·NFC 구성의 제한된 정보 노출. 실제 출퇴근 위조까지는 도달하지 않아 Medium으로 분류했다.
- **검증 결과:** 수정 전 관계없는 MASTER principal의 두 사전 검증 요청이 200으로 응답해 회귀 테스트에서 재현됐다.
- **수정 내용:** 위치 검증은 항상 `assertMemberOfStore`를 수행하고, NFC 검증은 기존의 storeId 누락 시 일반 실패 동작을 유지하면서 storeId가 있으면 같은 가드를 수행한다.
- **추가한 테스트:** `SecurityRbacTest`에 타 매장 `verify/location`, `verify/nfc` 각각의 403 기대값을 추가했다.
- **수정 후 검증 결과:** 타 매장 요청은 403이며, 소속 매장에 대한 기존 검증 경로는 유지된다.
- **남은 위험:** GPS 좌표의 진위와 NFC 복제 내성은 이 인가 수정의 범위 밖이며 실기기 E2E로 별도 확인해야 한다.

### SEC-AUD-017 — Medium — 로그인 rate-limit 키 분할과 메모리 증가

- **관련 파일과 함수:** `RateLimitFilter.doFilterInternal`, `RateLimitFilter.resolveLoginBucket`.
- **문제 코드 경로:** `/api/login`의 버킷 키가 `clientIp + request.getParameter("email")`였다. JSON 로그인에서는 이메일이 null인 반면, 공격자는 쿼리의 email을 매번 바꿔 IP별 5회 제한을 우회하고 버킷 map을 계속 늘릴 수 있었다.
- **필요한 공격 조건:** 한 IP에서 로그인 엔드포인트로 반복 요청을 보낼 수 있어야 한다.
- **예상 영향:** 계정 대입 시도의 IP 제한 약화와 애플리케이션 메모리 증가. 로그인 자체의 계정별 제어는 별도 서비스가 담당하므로 Medium으로 분류했다.
- **검증 결과:** 수정 전 서로 다른 query email 다섯 개 뒤 여섯 번째 요청도 204가 되어 재현됐다.
- **수정 내용:** 필터 버킷 키를 신뢰 경계인 `clientIp`로만 고정했다. JSON 본문·query·form의 클라이언트 입력은 키에 포함하지 않는다.
- **추가한 테스트:** `RateLimitFilterTest`가 같은 IP와 변형된 query email 여섯 번째 요청에서 429를 요구한다.
- **수정 후 검증 결과:** 해당 테스트가 통과했고, 변형된 email로도 우회되지 않는다.
- **남은 위험:** 현재 버킷은 단일 인스턴스 메모리다. 다중 인스턴스 운영의 분산 rate-limit 및 버킷 만료 정책은 Redis 기반 구현으로 보완해야 한다.

### SEC-AUD-018 — Low — 결제 식별자 및 공급자 오류 본문 로깅

- **관련 파일과 함수:** `LiveTossPaymentGateway.confirm/cancel`, `LiveTossBillingClient.issueBillingKey/charge/cancel`, `TossWebhookService.processWebhookPayload`, 새 `PaymentLogRedactor.redact`.
- **문제 코드 경로:** Toss paymentKey·orderId·customerKey와 HTTP 오류 응답 본문이 INFO/WARN 로그 인자로 전달될 수 있었다.
- **필요한 공격 조건:** 결제 동작 또는 웹훅이 발생하고 애플리케이션 로그를 읽을 권한이 있어야 한다.
- **예상 영향:** 결제 식별자·공급자 오류 정보가 로그 보존 시스템으로 확산. 로그 접근이 추가 조건이라 Low로 분류했다.
- **검증 결과:** 각 생산 코드 경로에서 원문 식별자/response body가 로그 인자로 사용되는 것을 소스에서 확인했다.
- **수정 내용:** 원문은 외부 요청과 DB 조회에만 유지하고, 로그 변수는 `[REDACTED]`로 교체했다. 공급자 오류 본문은 로그에 기록하지 않는다.
- **추가한 테스트:** `PaymentLogRedactorTest`가 null/빈 값/임의 식별자를 모두 redaction 처리하는지 확인한다.
- **수정 후 검증 결과:** redactor 단위 테스트와 관련 결제 코드를 포함한 컴파일이 통과했다. 결제 제공자 실제 호출은 범위상 하지 않았다.
- **남은 위험:** 기존 로그 집계본에 남은 식별자는 이번 코드 수정으로 제거되지 않는다. 운영 로그 보존 정책에서 별도 정리가 필요하다.

### SEC-AUD-019 — Medium — 모바일 토큰의 평문 저장 (미수정)

- **관련 파일과 함수:** `frontend/src/common/auth/tokenStore.ts`의 `setAccess/setRefresh/setTokens`, `frontend/src/common/utils/unifiedStorage.ts`의 AsyncStorage wrapper.
- **문제 코드 경로:** access token과 refresh token이 `@react-native-async-storage/async-storage`에 그대로 기록된다. 현재 `frontend/package.json`과 lockfile에서 Keychain/Keystore용 secure-storage 의존성은 확인되지 않았다.
- **필요한 공격 조건:** 루팅·탈옥·악성 디버깅·취약한 백업 등으로 해당 기기의 앱 저장소를 읽을 수 있어야 한다.
- **예상 영향:** access/refresh bearer credential 탈취 및 세션 재사용.
- **검증 결과:** 두 토큰 키가 AsyncStorage-backed `unifiedStorage.setItem`에 전달되는 소스 경로를 확인했다.
- **수정 내용:** 없음. 네이티브 Keychain/Keystore 의존성 추가와 iOS/Android 마이그레이션·로그아웃·복구 흐름 검증이 필요한 변경이어서, 이 감사에서 안전성 검증 없이 넓은 범위로 교체하지 않았다.
- **추가한 테스트:** 없음.
- **수정 후 검증 결과:** 해당 없음.
- **남은 위험:** 배포 전 secure storage로 이전하고, 기존 평문 토큰을 폐기/재발급하는 마이그레이션과 실기기 회귀 테스트가 필요하다.

### 이번 보충에서 수정한 파일

- 인가: `SystemContentAdminAuthorizer`, `SystemContentAdminOnly`, `LaborInfoController`, `PolicyInfoController`, `TaxInfoController`, `TipInfoController`, `QnaInfoController`, `AttendanceController`, `application.yml`.
- 인프라·rate limit: `docker-compose.yml`, `RateLimitFilter`.
- 로그: `PaymentLogRedactor`, `LiveTossPaymentGateway`, `LiveTossBillingClient`, `TossWebhookService`.
- 테스트: `SecurityRbacTest`, `LaborInfoIntegrationTest`, `RateLimitFilterTest`, `PaymentLogRedactorTest`.

### 이번 보충에서 실행한 명령과 결과

| 명령 또는 검사 | 결과 |
|---|---|
| 수정 전 RBAC 회귀 테스트 | SEC-AUD-014는 200 대 403 기대값 불일치, SEC-AUD-016은 타 매장 사전 검증 200으로 재현 |
| 수정 전 `RateLimitFilterTest` | query email 변형 여섯 번째 요청이 204로 재현 |
| `gradlew.bat test --tests SecurityRbacTest --tests LaborInfoIntegrationTest --tests RateLimitFilterTest --tests PaymentLogRedactorTest --offline --no-daemon` | 빌드 성공. 26 tests, failures 0, errors 0 |
| `gradlew.bat build -x test --offline --no-daemon` | 빌드 성공 |
| `docker compose config --no-interpolate` | DB·두 Redis·Adminer 포트가 모두 `127.0.0.1` 바인딩임을 확인 |
| `frontend\node_modules\.bin\tsc.cmd --noEmit` | 통과 |
| `frontend\npm run lint` | 종료 코드 0 |
| `web-master\npm run lint`, `web-master\node_modules\.bin\tsc.cmd --noEmit` | 모두 통과 |
| 정적 sink 검토 (`rg`) | 사용자 입력이 명령 실행 또는 동적 SQL로 이어지는 확인된 경로 없음; 외부 HTTP는 설정 기반 연동으로 한정 |
| `backend\gradlew.bat test --offline --no-daemon` 전체 재실행 | 12분 이상 결과 보고서 갱신 없이 고부하로 지속되어, 이 감사가 시작한 test process만 종료. 전체 통과로 판정하지 않음 |

### 미실행 또는 완료하지 못한 보충 검사

- React Native 전체 `npm run test:unit`: STOMP 재접속 타이머가 테스트 종료 뒤에도 남아 결과 요약 없이 반복 경고를 내고 대기했다. 시작한 프로세스만 종료했으며 통과·실패를 확정하지 않았다.
- `web-master` production build: `next/font/google`가 Google 글꼴을 가져오는 구성이라 외부 요청 금지 범위를 지키기 위해 미실행했다.
- 의존성 CVE DB 조회, 실서비스·외부 OAuth/결제/메일/FCM/S3 호출, Docker 실제 기동, 운영 DB와 실제 데이터, Android/iOS 실기기 E2E는 모두 범위 밖이다.

### 보충 후 남은 위험과 최종 판정

- **Critical: 0**
- **High: 0**
- **Medium: 2** — 기존 보고서의 PII migration/backfill 잔여 위험 1건과 SEC-AUD-019 모바일 평문 토큰 저장 1건.
- **Low: 1** — 기존 raw bearer credential이 보존된 DB/백업에 남을 수 있는 잔여 위험.

**최종 판정: CONDITIONAL PASS.** 코드 수준에서 확인된 High와 이번 보충의 Medium/Low는 최소 범위로 수정하고 회귀 테스트를 통과시켰다. 다만 모바일 토큰 저장, PII backfill, 전체 백엔드 테스트 및 모바일 전체 단위 테스트의 완료 결과가 남아 있으므로 이를 해결하기 전에는 “80% 이상 신뢰” 같은 수치 판정을 하지 않는다.

## 2026-07-30 continuation: active membership, payroll, and purchase integrity

### Scope and exclusions

- Local code and local Gradle test environment only. This continuation traced current-store functions, purchase amount construction, employment-amendment application, payroll period input, system-content uploads, static-resource configuration, and external-call sinks.
- Excluded: production, real user data, real OCR/payment/tax/signature calls, deployed object-storage/proxy behavior, CVE-network lookup, deployment, push, commit, and destructive changes.

### Project security structure confirmed

- Current employee actions use `StoreAccessGuard` / `StoreAuthorizationPolicy`; historical membership is retained only for past-record functions.
- Payroll, purchase, contract amendment, and store-notice writes are server-side service operations. Client IDs are authorized before service invocation.
- System-content mutation requires `SystemContentAdminOnly`. `FileUploadService` uses server-generated UUIDs, and no Spring `ResourceHandler` or Docker proxy publicly serves the local upload directory in this repository.
- All outbound HTTP call targets found are configuration-bound. The tax-office validator has no live caller because its three registration calls are commented out, so it is not a reachable SSRF or log-exposure finding.

### Finding summary

| ID | Severity | Status | Summary |
|---|---:|---|---|
| SEC-AUD-041 | Medium | Fixed and locally tested | A deactivated employee could acknowledge a notice, probe GPS/NFC configuration, or reactivate a historical store relation with a retained store code. |
| SEC-AUD-042 | Medium | Fixed and locally tested | Valid integer purchase inputs could overflow line or total amounts into negative persisted values. |
| SEC-AUD-043 | Medium | Fixed and locally tested | A former employee could receive a new amendment, and a verified amendment could later apply after deactivation. |
| SEC-AUD-044 | Medium | Fixed and locally tested | A store owner could persist payroll whose start date follows its end date. |

### Detailed findings

#### SEC-AUD-041 — deactivated employees retained current-store actions (Medium)

- Related files/functions: `StoreNoticeService.ack`, `AttendanceController.verifyLocation`, `AttendanceController.verifyNfc`, `StoreManagementServiceImpl.joinStoreByCode`.
- Code path and attack conditions: a former employee retaining a valid account/token and stale notice/store IDs or a store code passed historical-membership checks; join-by-code reactivated an inactive relation.
- Expected impact: forged notice-read state, GPS/NFC configuration probing, or unauthorized restoration of current store membership.
- Verification result: pre-fix local regressions reached these paths; the join-code regression observed inactive relation reactivation.
- Fix: notice acknowledgement and probes require active membership. Joining by code rejects inactive relations; only owner-controlled reactivation can restore them.
- Added tests: `StoreNoticeServiceSecurityTest`, `AttendanceVerificationControllerSecurityTest`, `StoreJoinReactivationSecurityTest`.
- Post-fix verification: 2 + 1 + 1 tests passed with zero failures/errors in local XML results.
- Residual risk: historical checks were not globally replaced because past payroll/contract records require them. New current-state routes must select active guards deliberately.

#### SEC-AUD-042 — purchase amount integer overflow (Medium)

- Related files/functions: `PurchaseItem.of`, `Purchase.recalcTotal`.
- Code path and attack conditions: an owner submitting high but otherwise valid price/quantity values caused rounded line amounts and the aggregate to overflow `int`.
- Expected impact: negative or incorrect purchase totals and corrupted cost/trend reporting; no payment-transfer path was involved.
- Verification result: pre-fix local tests accepted out-of-range line and aggregate amounts.
- Fix: reject non-finite/non-positive quantity, negative price, out-of-range line amount, and aggregate outside the persisted `int` range; aggregation uses `long`.
- Added tests: `PurchaseAmountIntegrityTest`.
- Post-fix verification: both overflow variations plus all five `PurchaseServiceTest` normal-flow cases passed.
- Residual risk: money remains integer won units; larger or fractional future requirements need a domain-wide decimal/range design.

#### SEC-AUD-043 — inactive employee amendment lifecycle (Medium)

- Related files/functions: `EmploymentAmendmentService.createDraft`, `send`, `apply`, `EmploymentAmendment.cancelAfterEmployeeDeactivation`.
- Code path and attack conditions: historical membership allowed a wage editor to draft for a former employee, while a verified amendment could apply after deactivation.
- Expected impact: unauthorized current employment-term changes or stale signed work becoming active after rehire.
- Verification result: two local regressions failed pre-fix: inactive draft creation was allowed and verified amendment changed an inactive relation.
- Fix: draft/send require active membership. Applying an amendment cancels it before changing an inactive relation, preserving evidence but preventing automatic future application.
- Added tests: two cases in `EmploymentAmendmentServiceTest`.
- Post-fix verification: all five amendment service tests passed.
- Residual risk: this controls local state. Provider-side cancellation/expiry of an already delivered signature request remains a release action.

#### SEC-AUD-044 — reversed payroll period persisted (Medium)

- Related files/functions: `PayrollCalculationRequestDto.isPeriodChronological`, `PayrollService.calculatePayroll`.
- Code path and attack conditions: an authenticated owner submits `startDate > endDate`; authorization and locking succeeded, then service code persisted an inverted payroll range.
- Expected impact: invalid payroll rows and misleading payroll state/reporting; no cross-store authorization bypass was demonstrated.
- Verification result: the local regression failed pre-fix because the inverted period was accepted and persisted.
- Fix: Bean Validation rejects the HTTP request shape, and the shared service boundary independently rejects null or reversed dates for internal/batch callers.
- Added tests: `PayrollRecalculationTest.calculationWithAnInvertedPeriodIsRejected`.
- Post-fix verification: all five payroll recalculation cases passed, including normal recalculation and finalized-payroll protections.
- Residual risk: payroll duration/calendar policy is a separate product rule; this patch intentionally enforces chronology only.

### Files changed in this continuation

- Production: `AttendanceController`, `StoreNoticeService`, `StoreManagementServiceImpl`, `PurchaseItem`, `Purchase`, `EmploymentAmendment`, `EmploymentAmendmentService`, `PayrollCalculationRequestDto`, `PayrollService`.
- Tests: `AttendanceVerificationControllerSecurityTest`, `StoreNoticeServiceSecurityTest`, `StoreJoinReactivationSecurityTest`, `PurchaseAmountIntegrityTest`, `PayrollRecalculationTest`, `EmploymentAmendmentServiceTest`.

### Commands and results

| Local command/check | Result |
|---|---|
| Targeted Gradle selection for notices, attendance verification, join-by-code, purchase, amendments, and payroll | XML results: 21 tests, 0 failures, 0 errors. The desktop command wrapper timed out at 64 seconds after the worker had written passing XML; this is not a full-suite pass. |
| `backend\\gradlew.bat build -x test --offline --no-daemon` | PASS — build successful in 27 seconds. |
| Static searches for resource handlers, external URLs, command execution, dynamic SQL, and frontend image consumers | No user-controlled command/dynamic-SQL path; no local public upload mapping; external endpoints configuration-bound. |
| `git diff --check` | PASS — no whitespace errors; line-ending notices only. |

### Unrun checks and remaining risk

- Full backend suite did not finish under the local wrapper; it is not claimed as passing. Full WebSocket and inactive-attendance integration behavior remains incomplete for the same reason.
- Current frontend/web lint/type/unit suites were not rerun for this backend-only continuation. Future web/public file mapping needs a separate MIME/content/disposition test with malicious local files.
- No external CVE database, production configuration, object-store proxy, or third-party provider was contacted. Historic PII backfill verification, mobile secure-storage migration, provider cancellation, and multi-node rate-limit design remain release actions.

### Quantified assessment and final decision

- Verified local code posture: **83/100**. This is evidence-limited and never a claim of invulnerability.
- Release assurance: **64/100**, limited by incomplete full suites and untested deployment/object-storage/provider behavior.
- Remaining verified risk register: **Critical 0 / High 0 / Medium 2 / Low 1** (pre-existing historic-data and deployment-scale items). SEC-AUD-041 through 044 are fixed locally and are not open code findings.
- Required before deployment: complete backend/frontend/web CI; validate PII backfill and key rotation on sanitized staging; configure narrow production CORS/CSRF/proxy and distributed rate limiting when scaled; implement/test provider cancellation; validate any public file/object mapping locally.

**Final decision: CONDITIONAL PASS.** No software can be guaranteed impossible to breach; this decision covers only the local evidence documented here.
