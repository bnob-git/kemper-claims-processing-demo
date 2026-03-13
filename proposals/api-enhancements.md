# PNC Claims Portal -- API Enhancement Proposal

**Author:** Devin (requested by @bnob-git)
**Date:** 2026-02-20
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current API State](#2-current-api-state)
3. [Identified Gaps and Issues](#3-identified-gaps-and-issues)
4. [Proposed Enhancements](#4-proposed-enhancements)
5. [Effort Estimates](#5-effort-estimates)
6. [Appendix: Current Endpoint Catalog](#6-appendix-current-endpoint-catalog)

---

## 1. Executive Summary

The PNC Claims Portal backend is a Spring Boot 3.2.5 application (Java 17) exposing a REST API for P&C auto-claim processing. It uses Spring Data JPA with an H2 in-memory database, SpringDoc OpenAPI for documentation, and includes `spring-boot-starter-validation` (though validation annotations are not yet applied).

The API covers the core claims lifecycle (FNOL intake, triage/assignment, reserve decision, document management, payment, and closure), plus read-only endpoints for policies and users. However, the review reveals significant gaps in **input validation**, **error handling**, **search/filtering**, **pagination**, **security**, and **API design consistency**. There are also three known bugs (BUG-001 through BUG-003) and several planned enhancements (ENHANCE-001, ENHANCE-002) that require backend API changes.

This proposal catalogs the current state, identifies specific gaps, and recommends concrete enhancements organized by priority and estimated effort.

---

## 2. Current API State

### 2.1 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Spring Boot | 3.2.5 |
| Java | OpenJDK | 17 |
| ORM | Spring Data JPA / Hibernate | (managed by Boot) |
| Database | H2 (in-memory, create-drop) | runtime |
| API Docs | springdoc-openapi-starter-webmvc-ui | 2.5.0 |
| Validation | spring-boot-starter-validation | (managed by Boot, **unused**) |
| Build | Maven | -- |

### 2.2 Architecture Overview

```
Controllers (3)
  ClaimController   -> ClaimService  -> 7 Repositories
  PolicyController  -> PolicyRepository (direct)
  UserController    -> UserRepository (direct)
```

- **ClaimController** is the primary controller with 11 endpoints covering the full claim lifecycle.
- **PolicyController** and **UserController** are thin read-only controllers that talk directly to repositories (no service layer).
- There is a single service class (`ClaimService`) that handles all claim business logic.
- There is **no global exception handler** (`@ControllerAdvice`).
- There is **no authentication or authorization** mechanism.
- CORS is configured for `http://localhost:4200` only.

### 2.3 Entities

| Entity | Key Fields | Notes |
|---|---|---|
| `Claim` | id, claimNumber, policy (ManyToOne EAGER), status, lossType, severityScore, lossDate, lossDescription, reportedDate, claimantName, claimantPhone, reserveAmount, settlementAmount, subrogationFlag, createdAt, updatedAt | Core entity; uses `@PrePersist`/`@PreUpdate` for timestamps |
| `Policy` | id, policyNumber, holderName, holderEmail, vehicle info, effectiveDate, expirationDate | Referenced by Claim |
| `AppUser` | id, username, fullName, role, email | Adjusters/managers |
| `Assignment` | id, claimId, adjusterId, assignedDate, assignmentType, notes, adjuster (ManyToOne EAGER) | Links claim to adjuster |
| `ClaimEvent` | id, claimId, eventType, oldStatus, newStatus, notes, createdBy, createdAt | Audit trail |
| `DocumentMetadata` | id, claimId, fileName, documentType, uploadedBy, uploadedAt, notes | Document tracking (metadata only) |
| `Payment` | id, claimId, amount, paymentType, paymentDate, referenceNumber, status, createdBy | Settlement payments |

### 2.4 Current Endpoint Catalog

See [Appendix](#6-appendix-current-endpoint-catalog) for the full endpoint table with HTTP methods, request/response shapes, and behavior notes.

---

## 3. Identified Gaps and Issues

### 3.1 Input Validation (Critical)

**Current state:** The `spring-boot-starter-validation` dependency is declared in `pom.xml` but **no `@Valid`, `@NotNull`, `@NotBlank`, `@Min`, `@Max`, or `@Size` annotations are used anywhere**. All POST/PATCH endpoints accept raw `Map<String, Object>` or `Map<String, String>` request bodies with no schema enforcement.

**Specific issues:**

| Endpoint | Issue |
|---|---|
| `POST /api/claims` | No validation on required fields (policyId, lossType, severityScore, lossDate, claimantName). A missing key causes an unhandled `NullPointerException`. Invalid `severityScore` (0, negative, >10) is accepted. No check that lossDate is in the past. No check that the policy is active (not expired). |
| `PATCH /api/claims/{id}/status` | No validation on the `status` value -- any arbitrary string is accepted. No state-machine enforcement (e.g., jumping from OPEN to CLOSED is allowed). |
| `POST /api/claims/{id}/reserve-decision` | No validation on `decision` value (only APPROVE/DENY should be accepted). Negative or zero `amount` is accepted. |
| `POST /api/claims/{id}/documents` | `fileName` can be null/empty. No file-type validation. |
| `POST /api/claims/{id}/payments` | No validation on `amount` (negative values accepted). No check that claim is in the correct status for payment. |
| `POST /api/claims/{id}/assignments` | `adjusterId` in manual assignment is not validated for role appropriateness. |
| `POST /api/claims/{id}/close` | No check that claim is in SETTLED status before closing. |

**Impact:** Data integrity violations, misleading claim records, potential for frontend to create invalid states.

### 3.2 Error Handling (Critical)

**Current state:** There is **no `@ControllerAdvice` or global exception handler**. All "not found" cases throw bare `RuntimeException` with a simple message string. Spring Boot's default error handling returns these as HTTP 500 with a generic JSON body.

**Specific issues:**

- `RuntimeException("Claim not found: " + id)` returns HTTP 500 instead of 404.
- `RuntimeException("Policy not found: " + id)` returns HTTP 500 instead of 404.
- `RuntimeException("User not found: " + id)` returns HTTP 500 instead of 404.
- `NullPointerException` from missing map keys in request bodies returns HTTP 500 with a stack trace.
- `NumberFormatException` from malformed numeric inputs returns HTTP 500.
- No consistent error response body structure (no `errorCode`, `message`, `timestamp`, `path` fields).
- Stack traces may leak to the client in non-production profiles.

**Impact:** Poor developer experience, difficulty debugging, potential security risk from stack trace leakage, incorrect HTTP semantics.

### 3.3 API Design Issues (High)

| Issue | Details |
|---|---|
| **Untyped request bodies** | All POST/PATCH endpoints use `Map<String, Object>` instead of dedicated DTO/request classes. This makes the API contract implicit, breaks OpenAPI schema generation, and prevents compile-time safety. |
| **No response DTOs** | Entities are returned directly, coupling the API contract to the database schema. Changes to entities automatically change the API. The `Policy` entity is eagerly fetched inside every `Claim` response, which may expose unnecessary data. |
| **No envelope/wrapper** | List endpoints return raw JSON arrays. No metadata (total count, page info) is included. |
| **Inconsistent use of HTTP methods** | `POST /api/claims/{id}/close` and `POST /api/claims/{id}/reserve-decision` are action-oriented but could be modeled as PATCH on the claim resource. |
| **No API versioning** | All endpoints are under `/api/` with no version prefix (e.g., `/api/v1/`). This will make breaking changes harder to manage. |
| **No HATEOAS or links** | Responses don't include links to related sub-resources (events, documents, payments, assignments). |
| **Status as freeform string** | Claim status is a plain `String` with no enum constraint on the entity or in the API. Any string can be stored. |

### 3.4 Missing CRUD Operations and Workflow Actions (High)

| Gap | Details |
|---|---|
| **No claim update (general PATCH/PUT)** | There is no way to update claim fields (claimantName, claimantPhone, lossDescription, etc.) after creation. Only status changes are supported. |
| **No claim deletion (soft or hard)** | No DELETE endpoint exists. Even a soft-delete (status = VOID/CANCELLED) is missing. |
| **No document deletion** | Documents can be added but never removed. |
| **No payment reversal/void** | Payments can be created but not voided or reversed. |
| **No assignment removal/reassignment** | Assignments can be created but not updated or deactivated. |
| **No policy search** | `GET /api/policies` returns all policies with no filtering. |
| **No user filtering by role** | `GET /api/users` returns all users. The `findByRole` repository method exists but is not exposed. |
| **No claim search** | `GET /api/claims` only supports `?status=` filter. No search by claimNumber, claimantName, policyNumber, lossType, or date range. (See ENHANCE-001.) |
| **No dashboard/summary endpoint** | No aggregation endpoint for claim counts by status, average processing time, etc. |
| **No notification history endpoint** | Planned per ENHANCE-002 but not yet implemented. |
| **No claim-by-claimNumber lookup** | `ClaimRepository.findByClaimNumber()` exists but is not exposed via the API. |

### 3.5 Performance (Medium)

| Issue | Details |
|---|---|
| **No pagination** | `GET /api/claims`, `GET /api/policies`, `GET /api/users` all return full lists via `findAll()`. This will not scale. |
| **Eager fetch on Policy** | `Claim.policy` is `FetchType.EAGER`. Every claim query loads the full policy object. When listing all claims, this triggers N+1 queries (one per claim to load its policy) unless Hibernate batching is configured. |
| **Eager fetch on Assignment.adjuster** | Same pattern -- `Assignment.adjuster` is eagerly loaded. |
| **No caching** | Policies and users are relatively static data. No `@Cacheable` or HTTP cache headers are used. |
| **No database indexing hints** | No `@Index` annotations on frequently queried columns (`claim.status`, `claim.claimNumber`, `assignment.claimId`, etc.). |
| **Full entity serialization** | Returning full entities (including nested policy) on list endpoints is wasteful. A summary DTO for list views would reduce payload size. |

### 3.6 Security (High)

| Issue | Details |
|---|---|
| **No authentication** | No Spring Security dependency. No login, no JWT, no session management. Any client can call any endpoint. |
| **No authorization** | No role-based access control. An adjuster can do anything a manager can do. The `X-User` header in `updateClaimStatus` is a trust-the-client pattern with no verification. |
| **CORS wide open for dev** | `allowedHeaders("*")` is overly permissive. Credentials are not configured. Only `localhost:4200` is in the allow list, which is fine for dev but needs environment-specific configuration for production. |
| **H2 console enabled** | `spring.h2.console.enabled=true` exposes the database console at `/h2-console` with no authentication. This is a severe vulnerability if deployed. |
| **No rate limiting** | No protection against brute-force or abuse. |
| **No input sanitization** | String fields (lossDescription, notes, etc.) are stored as-is with no XSS or SQL injection protection beyond JPA parameterization. |
| **No CSRF protection** | Not applicable for a stateless REST API with token auth, but relevant if session-based auth is ever added. |

### 3.7 Known Bugs Requiring API-Level Awareness

| Bug | API Impact |
|---|---|
| **BUG-001** (FNOL validation bypass) | Primarily a frontend issue, but the backend API also lacks server-side validation, so invalid claims reach the database regardless. |
| **BUG-002** (Theft case mismatch) | Backend `autoAssignClaim()` compares `"Theft"` vs `"THEFT"`. The API should normalize/validate `lossType` values on input. |
| **BUG-003** (Reserve rounding) | Backend `setReserveDecision()` uses `double` arithmetic. API response returns incorrect reserve amounts for certain severity scores. |

---

## 4. Proposed Enhancements

### 4.1 Introduce Request/Response DTOs and Typed Contracts

**Priority:** Critical
**Effort:** Medium

Replace all `Map<String, Object>` and `Map<String, String>` request bodies with strongly-typed DTO classes. Create response DTOs to decouple the API contract from JPA entities.

**Proposed DTOs:**

```
dto/
  request/
    CreateClaimRequest     (policyId, lossType, severityScore, lossDate, lossDescription, claimantName, claimantPhone)
    UpdateClaimStatusRequest  (status)
    ReserveDecisionRequest    (decision, amount)
    CreateAssignmentRequest   (adjusterId, notes)
    CreateDocumentRequest     (fileName, documentType, uploadedBy, notes)
    CreatePaymentRequest      (amount, createdBy)
    CloseClaimRequest         (subrogation)
  response/
    ClaimSummaryResponse     (id, claimNumber, status, lossType, claimantName, reportedDate -- for list views)
    ClaimDetailResponse      (full claim with nested policy, counts of events/docs/payments)
    ErrorResponse            (timestamp, status, error, message, path)
    PagedResponse<T>         (content, page, size, totalElements, totalPages)
```

### 4.2 Add Global Exception Handler

**Priority:** Critical
**Effort:** Small

Create a `@RestControllerAdvice` class to handle exceptions consistently:

```
GlobalExceptionHandler
  - ResourceNotFoundException     -> 404 with ErrorResponse
  - ValidationException           -> 400 with ErrorResponse + field errors
  - IllegalStateException         -> 409 (Conflict) with ErrorResponse
  - MethodArgumentNotValidException -> 400 with field-level errors
  - Generic Exception             -> 500 with safe error message (no stack trace)
```

Replace all `RuntimeException` throws with domain-specific exceptions (e.g., `ClaimNotFoundException`, `PolicyNotFoundException`, `InvalidStatusTransitionException`).

### 4.3 Add Input Validation

**Priority:** Critical
**Effort:** Medium

Apply Jakarta Validation annotations to all request DTOs:

| Field | Constraints |
|---|---|
| `CreateClaimRequest.policyId` | `@NotNull` |
| `CreateClaimRequest.lossType` | `@NotBlank`, validate against enum (COLLISION, THEFT, WEATHER, LIABILITY, OTHER) |
| `CreateClaimRequest.severityScore` | `@NotNull`, `@Min(1)`, `@Max(10)` |
| `CreateClaimRequest.lossDate` | `@NotNull`, `@PastOrPresent` |
| `CreateClaimRequest.claimantName` | `@NotBlank`, `@Size(max = 200)` |
| `CreateClaimRequest.claimantPhone` | `@Pattern(regexp = "...")` |
| `UpdateClaimStatusRequest.status` | `@NotBlank`, validate against allowed status enum |
| `ReserveDecisionRequest.decision` | `@NotBlank`, validate against APPROVE/DENY |
| `ReserveDecisionRequest.amount` | `@Positive` (when present) |
| `CreatePaymentRequest.amount` | `@NotNull`, `@Positive` |
| `CreateDocumentRequest.fileName` | `@NotBlank` |

Add `@Valid` annotation to all `@RequestBody` parameters in controllers.

### 4.4 Implement Claim Status State Machine

**Priority:** High
**Effort:** Medium

Define valid status transitions and enforce them in the service layer:

```
OPEN -> UNDER_INVESTIGATION
UNDER_INVESTIGATION -> RESERVE_SET, DENIED
RESERVE_SET -> SETTLED, DENIED
SETTLED -> CLOSED
DENIED -> CLOSED (reopened by appeal)
CLOSED -> (terminal, no transitions)
```

- Create a `ClaimStatus` enum with a `canTransitionTo(ClaimStatus target)` method.
- Reject invalid transitions with HTTP 409 Conflict.
- This addresses the issue of arbitrary status strings being accepted.

### 4.5 Add Pagination to All List Endpoints

**Priority:** High
**Effort:** Small

Convert all `findAll()` calls to use `Pageable`:

| Endpoint | Change |
|---|---|
| `GET /api/claims` | Accept `?page=0&size=20&sort=createdAt,desc` |
| `GET /api/claims/{id}/events` | Accept `?page=0&size=50` |
| `GET /api/claims/{id}/documents` | Accept `?page=0&size=20` |
| `GET /api/claims/{id}/payments` | Accept `?page=0&size=20` |
| `GET /api/policies` | Accept `?page=0&size=20` |
| `GET /api/users` | Accept `?page=0&size=20` |

Return responses wrapped in Spring's `Page<T>` or a custom `PagedResponse<T>` DTO.

### 4.6 Add Claim Search and Advanced Filtering

**Priority:** High
**Effort:** Medium

Per ENHANCE-001, extend `GET /api/claims` to support:

| Parameter | Type | Behavior |
|---|---|---|
| `status` | String | Exact match (existing) |
| `q` | String | Partial match on claimNumber, claimantName, or policyNumber |
| `lossType` | String (comma-separated) | Filter by one or more loss types |
| `lossDateFrom` | LocalDate | Claims with lossDate >= value |
| `lossDateTo` | LocalDate | Claims with lossDate <= value |
| `assignedTo` | Long | Claims assigned to a specific adjuster |

Implementation options:
- **Spring Data JPA Specifications** (recommended) for dynamic query composition.
- Alternatively, a `@Query` with JPQL and conditional predicates.

Add a dedicated endpoint for claim-number lookup:
- `GET /api/claims/by-number/{claimNumber}` -- uses the existing `ClaimRepository.findByClaimNumber()` method that is currently unexposed.

### 4.7 Add Missing CRUD and Workflow Endpoints

**Priority:** Medium
**Effort:** Medium

| New Endpoint | Method | Purpose |
|---|---|---|
| `PATCH /api/claims/{id}` | PATCH | Update mutable claim fields (claimantName, claimantPhone, lossDescription) |
| `POST /api/claims/{id}/cancel` | POST | Soft-cancel a claim (set status to CANCELLED, record event) |
| `DELETE /api/claims/{id}/documents/{docId}` | DELETE | Remove a document from a claim |
| `POST /api/claims/{id}/payments/{payId}/void` | POST | Void a payment (set payment status to VOIDED, reverse settlement amount) |
| `PUT /api/claims/{id}/assignments/{assignId}` | PUT | Update an assignment (change adjuster, update notes) |
| `DELETE /api/claims/{id}/assignments/{assignId}` | DELETE | Remove an assignment |
| `GET /api/claims/by-number/{claimNumber}` | GET | Lookup claim by claim number |
| `GET /api/users?role={role}` | GET | Filter users by role (expose existing repo method) |
| `GET /api/policies?q={search}` | GET | Search policies by policyNumber or holderName |
| `GET /api/dashboard/summary` | GET | Return aggregated claim counts by status |
| `GET /api/claims/{id}/notifications` | GET | Notification history (per ENHANCE-002) |

### 4.8 Add Notification Service Stubs

**Priority:** Medium
**Effort:** Medium

Per ENHANCE-002:
- Create `NotificationLog` entity (id, claimId, recipientEmail, subject, body, status, createdAt).
- Create `NotificationService` with `notifyStatusChange(Claim, oldStatus, newStatus)` method.
- Wire into all status-changing flows in `ClaimService`.
- Expose via `GET /api/claims/{id}/notifications`.

### 4.9 Introduce API Versioning

**Priority:** Medium
**Effort:** Small

Adopt URL-based versioning:
- Move all endpoints from `/api/` to `/api/v1/`.
- Configure SpringDoc to group endpoints by version.
- Maintain `/api/` as an alias for `/api/v1/` during the transition.

### 4.10 Add Authentication and Authorization

**Priority:** High
**Effort:** Large

Add Spring Security with JWT-based authentication:

1. Add `spring-boot-starter-security` dependency.
2. Implement JWT token issuance (`POST /api/v1/auth/login`) and validation filter.
3. Define roles: `ADJUSTER`, `SENIOR_ADJUSTER`, `MANAGER`, `ADMIN`.
4. Apply method-level security:

| Endpoint | Required Role |
|---|---|
| `POST /api/v1/claims` | ADJUSTER, MANAGER |
| `PATCH /api/v1/claims/{id}/status` | ADJUSTER (own claims), MANAGER (any) |
| `POST /api/v1/claims/{id}/reserve-decision` | SENIOR_ADJUSTER, MANAGER |
| `POST /api/v1/claims/{id}/payments` | MANAGER |
| `POST /api/v1/claims/{id}/close` | MANAGER |
| `GET /api/v1/users` | MANAGER, ADMIN |

5. Replace the `X-User` header with the authenticated principal.
6. Disable H2 console in non-dev profiles.

### 4.11 Improve Performance

**Priority:** Medium
**Effort:** Small-Medium

| Enhancement | Details |
|---|---|
| **Switch Claim.policy to LAZY fetch** | Use `FetchType.LAZY` and fetch-join only when needed (detail view). Requires a `ClaimSummaryResponse` DTO that omits the policy for list views. |
| **Add database indexes** | Add `@Index` on `claim.status`, `claim.claim_number`, `assignment.claim_id`, `claim_event.claim_id`, `document_metadata.claim_id`, `payment.claim_id`. |
| **Add HTTP cache headers** | `Cache-Control` on policy and user list endpoints (these change infrequently). |
| **Add Spring `@Cacheable`** | Cache policy lookups and user-by-role queries with TTL-based eviction. |
| **Batch fetching** | Configure `@BatchSize(size = 20)` on collections to mitigate N+1 queries for eager associations. |

### 4.12 Enhance OpenAPI Documentation

**Priority:** Low
**Effort:** Small

The SpringDoc dependency is present and serving docs at `/swagger-ui.html`, but there are no `@Operation`, `@ApiResponse`, `@Schema`, or `@Tag` annotations.

- Add `@Tag` annotations to each controller for grouping.
- Add `@Operation(summary = "...", description = "...")` to each endpoint.
- Add `@ApiResponse` annotations for success and error cases.
- Add `@Schema` annotations to DTO fields for descriptions and examples.
- Configure global `ErrorResponse` schema for 4xx/5xx responses.

### 4.13 Introduce Service Layer for Policies and Users

**Priority:** Low
**Effort:** Small

`PolicyController` and `UserController` call repositories directly, bypassing any service layer. This is inconsistent with `ClaimController`'s architecture and makes it harder to add business logic (e.g., policy expiration checks, user deactivation).

- Create `PolicyService` and `UserService`.
- Move repository calls behind the service layer.
- Add policy-active validation in `PolicyService.getActivePolicy(id)` for use during claim creation.

### 4.14 CORS Hardening

**Priority:** Medium
**Effort:** Small

- Externalize allowed origins to environment-specific configuration (already partially done via `app.cors.allowed-origins`).
- Restrict `allowedHeaders` to a specific list instead of `"*"`.
- Add `allowCredentials(true)` if cookie/token-based auth is added.
- Add `maxAge(3600)` to reduce preflight requests.

---

## 5. Effort Estimates

| # | Enhancement | Priority | Effort | Dependencies |
|---|---|---|---|---|
| 4.1 | Request/Response DTOs | Critical | Medium (3-5 days) | None |
| 4.2 | Global Exception Handler | Critical | Small (1 day) | 4.1 (for ErrorResponse DTO) |
| 4.3 | Input Validation | Critical | Medium (2-3 days) | 4.1 (for DTO annotations) |
| 4.4 | Status State Machine | High | Medium (2-3 days) | 4.2 (for error responses) |
| 4.5 | Pagination | High | Small (1-2 days) | 4.1 (for PagedResponse) |
| 4.6 | Claim Search/Filtering | High | Medium (3-4 days) | 4.5 |
| 4.7 | Missing CRUD Endpoints | Medium | Medium (3-4 days) | 4.1, 4.2, 4.3 |
| 4.8 | Notification Stubs | Medium | Medium (2-3 days) | 4.7 |
| 4.9 | API Versioning | Medium | Small (1 day) | None (do early) |
| 4.10 | Auth and Authorization | High | Large (5-8 days) | 4.9 |
| 4.11 | Performance Improvements | Medium | Small-Med (2-3 days) | 4.1 (for DTOs) |
| 4.12 | OpenAPI Annotations | Low | Small (1-2 days) | 4.1 |
| 4.13 | Service Layer for Policies/Users | Low | Small (1 day) | None |
| 4.14 | CORS Hardening | Medium | Small (0.5 days) | 4.10 |

### Recommended Implementation Order

**Phase 1 -- Foundation (Week 1-2):**
1. API Versioning (4.9)
2. Request/Response DTOs (4.1)
3. Global Exception Handler (4.2)
4. Input Validation (4.3)

**Phase 2 -- Core Features (Week 3-4):**
5. Status State Machine (4.4)
6. Pagination (4.5)
7. Claim Search/Filtering (4.6)
8. Missing CRUD Endpoints (4.7)

**Phase 3 -- Security and Quality (Week 5-6):**
9. Authentication and Authorization (4.10)
10. CORS Hardening (4.14)
11. Performance Improvements (4.11)

**Phase 4 -- Polish (Week 7):**
12. Service Layer for Policies/Users (4.13)
13. Notification Stubs (4.8)
14. OpenAPI Annotations (4.12)

---

## 6. Appendix: Current Endpoint Catalog

### ClaimController (`/api/claims`)

| # | Method | Path | Request Body | Response | Behavior | Issues |
|---|---|---|---|---|---|---|
| 1 | GET | `/api/claims` | -- (query: `?status=`) | `List<Claim>` | Returns all claims, optionally filtered by status | No pagination, no search, returns full entities with nested policy |
| 2 | GET | `/api/claims/{id}` | -- | `Claim` | Returns single claim by ID | Returns 500 on not-found (should be 404) |
| 3 | POST | `/api/claims` | `Map<String,Object>` (`policyId`, `lossType`, `severityScore`, `lossDate`, `lossDescription`, `claimantName`, `claimantPhone`) | `Claim` (201) | Creates a new claim (FNOL), logs event | No input validation; NPE on missing fields; no policy-active check |
| 4 | PATCH | `/api/claims/{id}/status` | `Map<String,String>` (`status`) | `Claim` | Updates claim status, logs event | No status validation; no state machine; accepts any string |
| 5 | GET | `/api/claims/{id}/events` | -- | `List<ClaimEvent>` | Returns audit events for a claim | No pagination |
| 6 | GET | `/api/claims/{id}/assignments` | -- | `List<Assignment>` | Returns assignments for a claim | No pagination |
| 7 | POST | `/api/claims/{id}/assignments` | `Map<String,Object>` (optional: `adjusterId`, `notes`) | `Assignment` (201) | Auto-assigns (empty body) or manual-assigns (with adjusterId) | BUG-002: Theft case mismatch; no role validation for manual assignment |
| 8 | POST | `/api/claims/{id}/reserve-decision` | `Map<String,Object>` (`decision`, optional: `amount`) | `Claim` | Approves/denies reserve; auto-calculates if no amount | BUG-003: Rounding error; no decision validation; returns 200 instead of 200/409 |
| 9 | GET | `/api/claims/{id}/documents` | -- | `List<DocumentMetadata>` | Returns documents for a claim | No pagination |
| 10 | POST | `/api/claims/{id}/documents` | `Map<String,String>` (`fileName`, `documentType`, `uploadedBy`, `notes`) | `DocumentMetadata` (201) | Adds document metadata | No fileName validation |
| 11 | GET | `/api/claims/{id}/payments` | -- | `List<Payment>` | Returns payments for a claim | No pagination |
| 12 | POST | `/api/claims/{id}/payments` | `Map<String,Object>` (`amount`, `createdBy`) | `Payment` (201) | Issues payment, sets status to SETTLED | No amount validation; no status check; hardcodes status to SETTLED |
| 13 | POST | `/api/claims/{id}/close` | `Map<String,Object>` (optional: `subrogation`) | `Claim` | Closes claim, sets subrogation flag | No status check (should require SETTLED) |

### PolicyController (`/api/policies`)

| # | Method | Path | Request Body | Response | Behavior | Issues |
|---|---|---|---|---|---|---|
| 14 | GET | `/api/policies` | -- | `List<Policy>` | Returns all policies | No pagination, no search |
| 15 | GET | `/api/policies/{id}` | -- | `Policy` | Returns single policy | Returns 500 on not-found |

### UserController (`/api/users`)

| # | Method | Path | Request Body | Response | Behavior | Issues |
|---|---|---|---|---|---|---|
| 16 | GET | `/api/users` | -- | `List<AppUser>` | Returns all users | No pagination, no role filter |
| 17 | GET | `/api/users/{id}` | -- | `AppUser` | Returns single user | Returns 500 on not-found |

---

*End of proposal.*
