# Test Coverage Improvement Plan

**Goal:** Increase overall test coverage to **85%** across backend and frontend.

**Date:** 2026-02-20

---

## 1. Current State of Test Coverage

### 1.1 Backend (Spring Boot / Java 17)

**Coverage tooling:** JaCoCo is **not configured**. No coverage reports are generated during `./mvnw test`. The numbers below are estimated by analyzing which source methods are exercised by the existing test class.

**Existing tests:** 1 test class (`ClaimServiceTest.java`) containing 10 test methods, of which 3 are tagged `@Tag("known-defect")` and excluded from builds via `maven-surefire-plugin`.

**Effective tests that run in CI: 7**

| Package / Class | Methods (total) | Methods Covered by Tests | Estimated Line Coverage | Notes |
|---|---|---|---|---|
| `service/ClaimService` | 16 | 10 (~62%) | ~55% | `getAllClaims`, `getClaimsByStatus`, `updateClaimStatus`, `manualAssignClaim`, `addDocument`, `getClaimEvents`, `getClaimAssignments`, `getClaimDocuments`, `getClaimPayments` have no direct unit tests. Some are exercised indirectly. |
| `controller/ClaimController` | 12 | 0 | 0% | No controller tests exist. |
| `controller/PolicyController` | 2 | 0 | 0% | No controller tests exist. |
| `controller/UserController` | 2 | 0 | 0% | No controller tests exist. |
| `config/CorsConfig` | 1 | 0 | 0% | No tests. |
| `entity/Claim` | 22 (getters/setters + lifecycle) | ~14 (indirectly) | ~60% | Exercised indirectly through service tests. |
| `entity/AppUser` | 10 | ~4 (indirectly) | ~40% | Partially exercised. |
| `entity/Assignment` | 14 | ~8 (indirectly) | ~55% | Partially exercised. |
| `entity/ClaimEvent` | 16 | ~6 (indirectly) | ~35% | Partially exercised. |
| `entity/DocumentMetadata` | 14 | 0 | 0% | Never exercised (addDocument not tested). |
| `entity/Payment` | 16 | ~8 (indirectly) | ~50% | Exercised via `issuePayment` test. |
| `entity/Policy` | 22 | ~2 (indirectly) | ~10% | Only `findById` path exercised. |
| `repository/*` (7 interfaces) | Spring-generated | ~4 custom queries exercised | ~30% | Custom query methods not directly tested. |

**Estimated overall backend coverage: ~25-30%** (weighted by line count; controllers at 0% are a significant portion of the codebase).

### 1.2 Frontend (Angular 17 / Karma + Jasmine)

**Coverage tooling:** Istanbul via `karma-coverage` is configured and working. Coverage report generated at `coverage/pnc-claims-portal/`.

**Measured coverage (from `ng test --code-coverage`):**

| Metric | Current | Target |
|---|---|---|
| **Statements** | **36.11%** (13/36) | 85% |
| **Branches** | **40%** (2/5) | 85% |
| **Functions** | **21.73%** (5/23) | 85% |
| **Lines** | **35.29%** (12/34) | 85% |

**Breakdown by module:**

| Module | Statements | Branches | Functions | Lines | Has Spec? |
|---|---|---|---|---|---|
| `app/` (AppComponent) | 100% (3/3) | 100% (0/0) | 100% (1/1) | 100% (2/2) | Yes |
| `app/components/dashboard/` | 100% (9/9) | 100% (2/2) | 100% (4/4) | 100% (9/9) | Yes |
| `app/services/` (ClaimsService) | 4.16% (1/24) | 0% (0/3) | 0% (0/18) | 4.34% (1/23) | No |
| `app/components/claim-detail/` | N/A* | N/A* | N/A* | N/A* | No |
| `app/components/fnol-form/` | N/A* | N/A* | N/A* | N/A* | No |
| `app/components/triage/` | N/A* | N/A* | N/A* | N/A* | No |
| `app/components/settlement/` | N/A* | N/A* | N/A* | N/A* | No |
| `app/models/claim.model.ts` | N/A | N/A | N/A | N/A | Interfaces only |

\* Components without spec files are not included in Istanbul's report at all, meaning their code is completely uncovered.

**Existing spec files:** 2 (`app.component.spec.ts` with 2 tests, `dashboard.component.spec.ts` with 3 tests = 5 total tests).

### 1.3 E2E Tests (Playwright)

**1 spec file** (`frontend/e2e/claim-workflow.spec.ts`) with 3 test cases covering the full claim workflow. These provide integration confidence but do not contribute to unit-level coverage metrics.

---

## 2. Known-Defect Tests (`@Tag("known-defect")`)

Three tests in `ClaimServiceTest.java` are tagged `@Tag("known-defect")` and excluded from the build via the `maven-surefire-plugin` configuration:

```xml
<configuration>
    <excludedGroups>known-defect</excludedGroups>
</configuration>
```

| Test Method | Defect Description |
|---|---|
| `testTriageAssignment_Theft_ShouldAssignSeniorAdjuster` | Triage rule checks `"Theft"` instead of `"THEFT"`, causing THEFT claims to be assigned to ADJUSTER instead of SENIOR_ADJUSTER. |
| `testReserveDecision_AutoCalculation_RoundingBug` | Reserve auto-calculation uses `double` arithmetic with `(long)` cast, causing precision loss (e.g., severity 7: happens to pass, but severity 3 fails). |
| `testReserveDecision_AutoCalculation_RoundingBug_Severity3` | Same rounding bug manifests clearly: `3 * 1000 * 1.15 = 3449.999...` truncates to `3449` instead of `3450`. |

**Recommendation:** These defects should be fixed in separate tickets. Once fixed, remove the `@Tag("known-defect")` annotation so these tests run in CI, adding 3 more passing tests to the suite.

---

## 3. Coverage Gaps and Prioritized Test Plan

### 3.1 Backend - Priority Ranked

#### P1: ClaimController Integration Tests (Critical - Large Effort)

**Why:** The controller layer is the API contract. Zero test coverage means regressions in request/response mapping, status codes, and error handling go undetected.

**Files:** `ClaimController.java` (12 endpoints)

**Tests needed:**
- `GET /api/claims` - list all claims, filter by status
- `GET /api/claims/{id}` - get by ID, 404 for missing
- `POST /api/claims` - create claim (FNOL), validate 201 status
- `PATCH /api/claims/{id}/status` - update status with X-User header
- `GET /api/claims/{id}/events` - timeline events
- `POST /api/claims/{id}/assignments` - auto-assign (no body) and manual-assign (with adjusterId)
- `POST /api/claims/{id}/reserve-decision` - approve with/without amount, deny
- `GET/POST /api/claims/{id}/documents` - document CRUD
- `GET/POST /api/claims/{id}/payments` - payment issuance
- `POST /api/claims/{id}/close` - close with/without subrogation

**Type:** Integration tests using `@WebMvcTest` + `MockMvc` (or `@SpringBootTest` with `TestRestTemplate`)

**Estimated effort:** **Large** (~15-20 test methods)

#### P2: PolicyController and UserController Tests (Medium Effort)

**Files:** `PolicyController.java` (2 endpoints), `UserController.java` (2 endpoints)

**Tests needed:**
- `GET /api/policies` - list all
- `GET /api/policies/{id}` - get by ID, 404 error
- `GET /api/users` - list all
- `GET /api/users/{id}` - get by ID, 404 error

**Type:** `@WebMvcTest` integration tests

**Estimated effort:** **Small** (~8 test methods)

#### P3: ClaimService - Missing Method Coverage (Medium Effort)

**Methods not directly tested:**
- `getAllClaims()`
- `getClaimsByStatus(String status)`
- `getClaimById(Long id)` - error path (claim not found)
- `updateClaimStatus(Long, String, String)`
- `manualAssignClaim(Long, Long, String)` - including error paths
- `addDocument(Long, Map<String, String>)`
- `getClaimEvents(Long)`
- `getClaimAssignments(Long)`
- `getClaimDocuments(Long)`
- `getClaimPayments(Long)`
- `setReserveDecision` - DENY path
- `autoAssignClaim` - fallback path (no candidates for required role)

**Type:** Unit tests (extend existing `ClaimServiceTest.java`)

**Estimated effort:** **Medium** (~12-15 test methods)

#### P4: Error/Edge Case Tests (Small Effort)

- Claim not found (RuntimeException)
- Policy not found during claim creation
- User not found during manual assignment
- Payment on non-RESERVE_SET claim
- Closing a non-SETTLED claim

**Type:** Unit tests

**Estimated effort:** **Small** (~5-8 test methods)

#### P5: CorsConfig Test (Small Effort)

**Type:** Integration test verifying CORS headers on API responses

**Estimated effort:** **Small** (~2 test methods)

### 3.2 Frontend - Priority Ranked

#### P1: ClaimsService Unit Tests (Critical - Medium Effort)

**Why:** The service is the data layer for every component. Currently at 4.16% statement coverage / 0% function coverage.

**File:** `claims.service.ts` (17 methods)

**Tests needed:**
- `getPolicies()`, `getPolicy(id)`
- `getClaims(status?)` - with and without status filter
- `getClaim(id)`, `createClaim(data)`
- `updateClaimStatus(id, status)`
- `getClaimEvents(id)`
- `getAssignments(claimId)`, `autoAssign(claimId)`, `manualAssign(claimId, adjusterId, notes)`
- `reserveDecision(claimId, decision, amount?)` - with and without amount
- `getDocuments(claimId)`, `addDocument(claimId, data)`
- `getPayments(claimId)`, `issuePayment(claimId, amount)`
- `closeClaim(claimId, subrogation)`
- `getUsers()`

**Type:** Unit tests using `HttpClientTestingModule` and `HttpTestingController`

**Estimated effort:** **Medium** (~18-20 test methods)

#### P2: FnolFormComponent Tests (Critical - Large Effort)

**Why:** Contains critical business logic (form validation, submission, intentional bugs). Zero coverage.

**File:** `fnol-form.component.ts`

**Tests needed:**
- Component creation
- Form initialization with correct validators
- Policy loading on init
- Form submission with valid data
- Form validation failure (markAllAsTouched)
- The `OTHER` loss type bypass bug path
- `formatDate` for Date objects and string inputs
- Error handling on submission failure
- Navigation after successful submission

**Type:** Component tests with mocked ClaimsService

**Estimated effort:** **Large** (~10-12 test methods)

#### P3: ClaimDetailComponent Tests (Medium Effort)

**File:** `claim-detail.component.ts`

**Tests needed:**
- Component creation and data loading (claim, events, assignments, documents, payments)
- `addDocument()` form submission and list update
- `getEventIcon()` for different event types
- Conditional button rendering (Triage/Settlement based on status)

**Type:** Component tests with mocked services

**Estimated effort:** **Medium** (~8-10 test methods)

#### P4: TriageComponent Tests (Medium Effort)

**File:** `triage.component.ts`

**Tests needed:**
- Component creation and data loading
- Auto-assign flow
- Manual-assign flow (with/without adjuster selected)
- Reserve approval with explicit amount
- Reserve approval without amount (auto-calc)
- Reserve denial
- Error states

**Type:** Component tests

**Estimated effort:** **Medium** (~8-10 test methods)

#### P5: SettlementComponent Tests (Medium Effort)

**File:** `settlement.component.ts`

**Tests needed:**
- Component creation and data loading
- Payment issuance
- Claim closing with/without subrogation
- Conditional rendering based on claim status

**Type:** Component tests

**Estimated effort:** **Medium** (~6-8 test methods)

#### P6: E2E Test Expansion (Small Effort)

**File:** `e2e/claim-workflow.spec.ts`

**Additional scenarios:**
- Error handling (invalid form submission)
- Status filtering on dashboard
- Document upload flow
- Manual assignment override

**Estimated effort:** **Small** (~3-4 additional test cases)

---

## 4. Tooling Recommendations

### 4.1 Backend: Add JaCoCo Maven Plugin

JaCoCo is not currently configured. Add the following to `backend/pom.xml`:

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.85</minimum>
                    </limit>
                </limits>
            </rule>
        </rules>
    </configuration>
</plugin>
```

This will:
- Generate HTML/XML coverage reports in `target/site/jacoco/`
- Enforce an 85% line coverage minimum (fail build if not met)

### 4.2 Frontend: Configure Coverage Thresholds

Update `karma.conf.js` to enforce thresholds:

```js
coverageReporter: {
  dir: require('path').join(__dirname, './coverage/pnc-claims-portal'),
  subdir: '.',
  reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcov' }],
  check: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85
    }
  }
}
```

### 4.3 Include All Source Files in Coverage

To ensure components without spec files are still counted in coverage reports, add to `angular.json` under the `test` architect:

```json
"codeCoverageExclude": [],
"sourceMap": true
```

And configure Istanbul to instrument all `.ts` files by ensuring `tsconfig.spec.json` includes all source files.

### 4.4 CI Integration

- Add coverage report upload to CI (e.g., Codecov or Coveralls)
- Add coverage badge to `README.md`
- Gate PRs on coverage thresholds (fail if coverage drops below 85%)

---

## 5. Effort Summary

| Area | Test Type | New Tests (est.) | Effort |
|---|---|---|---|
| **Backend: ClaimController** | Integration (`@WebMvcTest`) | ~18 | Large |
| **Backend: PolicyController + UserController** | Integration | ~8 | Small |
| **Backend: ClaimService (gaps)** | Unit (extend existing) | ~14 | Medium |
| **Backend: Error/edge cases** | Unit | ~6 | Small |
| **Backend: CorsConfig** | Integration | ~2 | Small |
| **Backend: JaCoCo setup** | Tooling | - | Small |
| **Frontend: ClaimsService** | Unit (`HttpClientTestingModule`) | ~19 | Medium |
| **Frontend: FnolFormComponent** | Component | ~11 | Large |
| **Frontend: ClaimDetailComponent** | Component | ~9 | Medium |
| **Frontend: TriageComponent** | Component | ~9 | Medium |
| **Frontend: SettlementComponent** | Component | ~7 | Medium |
| **Frontend: E2E expansion** | E2E (Playwright) | ~4 | Small |
| **Frontend: Coverage thresholds** | Tooling | - | Small |
| **Total** | | **~107 new tests** | |

---

## 6. Roadmap to 85% Coverage

### Phase 1: Foundation (Week 1)
- [ ] Add JaCoCo to `pom.xml` (no threshold enforcement yet)
- [ ] Add frontend coverage thresholds in `karma.conf.js` (warn only, don't fail)
- [ ] Write `ClaimsService` unit tests (frontend) - brings frontend services from 4% to ~90%+
- [ ] Write `ClaimService` missing-method tests (backend) - fills gaps in the only existing test class

**Expected coverage after Phase 1:**
- Backend: ~45-50%
- Frontend: ~50-55%

### Phase 2: Controllers & Components (Week 2)
- [ ] Write `ClaimController` integration tests (backend) - largest single coverage gain
- [ ] Write `PolicyController` + `UserController` tests (backend)
- [ ] Write `FnolFormComponent` spec (frontend)
- [ ] Write `ClaimDetailComponent` spec (frontend)

**Expected coverage after Phase 2:**
- Backend: ~75-80%
- Frontend: ~75-80%

### Phase 3: Close the Gap (Week 3)
- [ ] Write `TriageComponent` spec (frontend)
- [ ] Write `SettlementComponent` spec (frontend)
- [ ] Add error/edge-case tests for backend service methods
- [ ] Add `CorsConfig` test
- [ ] Expand E2E test suite
- [ ] Fix known defects (THEFT triage bug, reserve rounding bug) and un-tag the 3 `@Tag("known-defect")` tests

**Expected coverage after Phase 3:**
- Backend: **85%+**
- Frontend: **85%+**

### Phase 4: Enforce & Maintain (Week 4)
- [ ] Enable JaCoCo `check` goal to fail build below 85%
- [ ] Enable Karma coverage threshold enforcement (`check.global`)
- [ ] Add coverage gates to CI/CD pipeline
- [ ] Add Codecov/Coveralls integration and README badge
- [ ] Document testing conventions in a `CONTRIBUTING.md` or `TESTING.md`

---

## 7. Risks and Considerations

1. **Known defects must be fixed first** before their test tags can be removed. The 3 `known-defect` tests represent real bugs (THEFT triage, reserve rounding) that should be addressed in dedicated PRs.

2. **Entity getter/setter coverage** inflates or deflates numbers depending on the tool. JaCoCo counts these; consider excluding trivial getters/setters from threshold enforcement or accepting that they bring "free" coverage.

3. **Frontend components with inline templates** (all components in this project) are harder to get full branch coverage on since Angular template logic (e.g., `*ngIf`, `*ngFor`) requires DOM-level testing.

4. **E2E tests don't contribute to unit coverage metrics.** The Playwright tests provide confidence in the full workflow but are not reflected in Istanbul/JaCoCo reports.

5. **The `@SpringBootTest` integration tests** are slower than pure unit tests with mocks. Consider using `@WebMvcTest` for controllers and Mockito-based tests for service-layer unit tests to keep the test suite fast.
