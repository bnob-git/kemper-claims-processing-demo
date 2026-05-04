# PNC Claims Processing Lifecycle — Test Cases

This document defines comprehensive review-ready test cases (BDD + tabular) for the full P&C claim lifecycle in the `kemper-claims-processing-demo` Spring Boot backend. It covers FNOL intake, triage / auto-assignment, reserve decisioning, and settlement / closure, including explicit coverage of the three known seeded defects (BUG-001, BUG-002, BUG-003) documented in the repo's `tickets/` folder.

The test cases reference the implementation in `backend/src/main/java/com/pnc/claims/service/ClaimService.java` and `backend/src/main/java/com/pnc/claims/controller/ClaimController.java`, plus the seed data in `backend/src/main/resources/data.sql`.

## Scope & Traceability

| Reference   | Area        | Description                                                                                              |
|-------------|-------------|----------------------------------------------------------------------------------------------------------|
| AC-FNOL-001 | FNOL        | `POST /api/claims` with valid `policyId` returns 201 with claim number `CLM-<8 hex uppercase>`.          |
| AC-FNOL-002 | FNOL        | Each successful FNOL writes a `ClaimEvent` audit row of type `STATUS_CHANGE` to `OPEN`.                  |
| AC-FNOL-003 | FNOL        | Required fields: `policyId`, `lossType`, `severityScore`, `lossDate`, `lossDescription`, `claimantName`. |
| AC-FNOL-004 | FNOL        | `severityScore` MUST be an integer in `[1..10]` regardless of `lossType`.                                |
| AC-FNOL-005 | FNOL        | `policyId` must reference an existing policy; otherwise the claim is rejected.                           |
| AC-TRG-001  | Triage      | `POST /api/claims/{id}/assignments` with empty body triggers auto-assignment.                            |
| AC-TRG-002  | Triage      | `POST /api/claims/{id}/assignments` with `{adjusterId}` triggers manual assignment.                      |
| BR-TRG-001  | Triage      | Rule: `lossType=COLLISION` AND `severityScore >= 7` ⇒ `SENIOR_ADJUSTER`.                                 |
| BR-TRG-002  | Triage      | Rule: `lossType=THEFT` (any severity) ⇒ `SENIOR_ADJUSTER`.                                               |
| BR-TRG-003  | Triage      | Rule: everything else ⇒ `ADJUSTER`.                                                                      |
| BR-TRG-004  | Triage      | If no candidate exists for the required role, fall back to a user with role `ADJUSTER`.                  |
| AC-RES-001  | Reserve     | `POST /api/claims/{id}/reserve-decision` with `decision=APPROVE` and explicit `amount` uses that amount. |
| AC-RES-002  | Reserve     | `decision=APPROVE` without `amount` auto-calculates `severityScore * 1000 * 1.15` (BigDecimal, 2-dp).    |
| AC-RES-003  | Reserve     | `decision=DENY` transitions claim status to `DENIED` and leaves `reserveAmount` unset.                   |
| BR-RES-001  | Reserve     | Approved reserves transition status `* → RESERVE_SET` and emit a `STATUS_CHANGE` event.                  |
| AC-SET-001  | Settlement  | `POST /api/claims/{id}/payments` issues a payment, status moves to `SETTLED`, ref `^PAY-[A-Z0-9]{8}$`.   |
| AC-SET-002  | Closure     | `POST /api/claims/{id}/close` moves status to `CLOSED`; optional `subrogation` flag persisted.           |
| AC-SET-003  | Assignment  | Manual assignment with valid `adjusterId` records `assignmentType=MANUAL`.                               |
| BR-SET-001  | Lifecycle   | Legal happy path: `OPEN → UNDER_INVESTIGATION → RESERVE_SET → SETTLED → CLOSED`.                         |
| BR-SET-002  | Lifecycle   | Alternate path: `OPEN → DENIED` (after reserve denial), terminal.                                        |
| BUG-001     | FNOL        | FNOL validation bypass when `lossType=OTHER` allows `severity=0` and missing data to persist.            |
| BUG-002     | Triage      | Case-sensitivity bug: `"Theft".equals(...)` mismatches uppercase `"THEFT"` seed/enum value.              |
| BUG-003     | Reserve     | `double` arithmetic + `(long)` cast causes truncation in auto-calc (e.g. severity 3 → 3449 vs 3450).     |

## Coverage Matrix

| Area               | Positive | Negative | Boundary | Exception | Security | Total |
|--------------------|---------:|---------:|---------:|----------:|---------:|------:|
| FNOL               |        3 |        6 |        4 |         1 |        1 |    15 |
| Triage / Assign    |        3 |        3 |        2 |         1 |        1 |    10 |
| Reserve Decision   |        3 |        3 |        2 |         1 |        1 |    10 |
| Settlement/Closure |        4 |        3 |        2 |         1 |        1 |    11 |
| **Totals**         |   **13** |   **15** |   **10** |     **4** |    **4** |**46** |

## BDD Scenarios

### FNOL Feature

```gherkin
@feature @fnol @claim
Feature: First Notice of Loss (FNOL) intake — POST /api/claims

  As a claims intake user
  I want to submit a new auto claim
  So that the policy holder's loss is recorded and triaged downstream

  Background:
    Given the backend is running on port 8080
    And the seed data from "data.sql" is loaded
    And policy with id 1 (POL-2024-00101) exists for holder "Alice Henderson"
    And the user "intake-clerk" is authenticated with role "ADJUSTER"

  # Validates: AC-FNOL-001, AC-FNOL-002, AC-FNOL-003
  @positive @smoke
  Scenario: Submit a valid COLLISION FNOL with severity 5
    When I POST to "/api/claims" with body:
      | policyId         | 1                                                |
      | lossType         | COLLISION                                        |
      | severityScore    | 5                                                |
      | lossDate         | 2025-01-12                                       |
      | lossDescription  | Rear-end collision at 5th and Main, low speed.   |
      | claimantName     | Alice Henderson                                  |
      | claimantPhone    | 555-0101                                         |
    Then the response status is 201
    And the response body field "claimNumber" matches the regex "^CLM-[A-F0-9]{8}$"
    And the response body field "status" equals "OPEN"
    And a ClaimEvent row exists for the new claim with eventType "STATUS_CHANGE" and newStatus "OPEN" and notes "FNOL submitted"

  # Validates: AC-FNOL-001, BR-TRG-002 (downstream triage path is set up)
  @positive @regression
  Scenario: Submit a valid THEFT FNOL with severity 3
    When I POST to "/api/claims" with a valid body where lossType="THEFT" and severityScore=3
    Then the response status is 201
    And the persisted claim has lossType="THEFT" exactly (uppercase)
    And the persisted claim has severityScore=3

  # Validates: AC-FNOL-001
  @positive @regression
  Scenario: Submit a valid WEATHER FNOL with severity 2
    When I POST to "/api/claims" with a valid body where lossType="WEATHER" and severityScore=2
    Then the response status is 201
    And the persisted claim has status "OPEN"

  # Validates: AC-FNOL-003 — required field: policyId
  @negative @regression
  Scenario: Reject FNOL with missing policyId
    When I POST to "/api/claims" with a valid body but no "policyId" field
    Then the response status is 4xx
    And no claim row is inserted
    And no ClaimEvent row is inserted

  # Validates: AC-FNOL-005
  @negative @regression
  Scenario: Reject FNOL with non-existent policyId
    When I POST to "/api/claims" with policyId=999999 (no such policy)
    Then the response status is 4xx
    And the error message contains "Policy not found"

  # Validates: AC-FNOL-003 — required field: lossType
  @negative @regression
  Scenario: Reject FNOL with missing lossType
    When I POST to "/api/claims" with a valid body but no "lossType" field
    Then the response status is 4xx
    And no claim row is inserted

  # Validates: AC-FNOL-003 — required field: lossDescription
  @negative @regression
  Scenario: Reject FNOL with missing lossDescription
    When I POST to "/api/claims" with a valid body but no "lossDescription" field
    Then the response status is 4xx
    And no claim row is inserted

  # Validates: AC-FNOL-004 — severity range
  @negative @regression
  Scenario: Reject FNOL with negative severity
    When I POST to "/api/claims" with severityScore=-1 and lossType="COLLISION"
    Then the response status is 4xx
    And no claim row is inserted

  # Validates: AC-FNOL-004 — boundary (low side)
  @boundary @regression
  Scenario Outline: Severity bracket boundaries — accepted vs rejected
    When I POST to "/api/claims" with severityScore=<severity> and lossType="COLLISION"
    Then the response status is <expected_status>
    And the persisted (or non-persisted) state is <expected_outcome>

    Examples:
      | severity | expected_status | expected_outcome             |
      | 0        | 4xx             | rejected (below minimum)     |
      | 1        | 201             | accepted (minimum allowed)   |
      | 10       | 201             | accepted (maximum allowed)   |
      | 11       | 4xx             | rejected (above maximum)     |

  # Validates: AC-FNOL-001 (resilience)
  @exception @regression
  Scenario: FNOL persist fails when database is unreachable
    Given the database connection is interrupted (simulate JDBC pool exhaustion / DB outage)
    When I POST to "/api/claims" with a valid body
    Then the response status is 5xx
    And no orphan ClaimEvent row exists for a non-persisted claim
    And the transaction is rolled back atomically

  # Validates: AC-FNOL-005 (authorization / IDOR)
  @security @regression
  Scenario: User cannot create a claim against another user's policy (IDOR)
    Given the authenticated user owns policy with id 1
    When the user POSTs to "/api/claims" with policyId=2 (owned by "Brian Carter")
    Then the response status is 403 Forbidden (or 404 if policies are scoped per user)
    And no claim row is inserted

  # Validates: BUG-001 — FNOL validation bypass on lossType=OTHER
  @bug @negative @regression @fnol
  Scenario: BUG-001 — FNOL must reject lossType=OTHER with severity=0 and missing description
    # Expected per spec: validation rejects severity 0 / missing required data even when lossType is OTHER.
    # Actual today: the frontend short-circuits validity when lossType==='OTHER' and severityScore defaults to 0,
    #               so the API receives and persists an invalid claim. Backend validation should also reject this.
    When I POST to "/api/claims" with lossType="OTHER", severityScore=0, claimantName="" and no "lossDescription"
    Then the response status is 4xx                                       # expected (per spec)
    And no claim row is inserted                                          # expected (per spec)
    But the current build accepts the request and persists severity=0    # actual (BUG-001)
```

### Triage / Auto-Assignment Feature

```gherkin
@feature @triage @claim
Feature: Triage and auto-assignment — POST /api/claims/{id}/assignments

  Background:
    Given the backend is running on port 8080
    And the seed data has 2 SENIOR_ADJUSTER users (ids 1, 3) and 1 ADJUSTER user (id 2)
    And the user "supervisor" is authenticated with role "SENIOR_ADJUSTER"

  # Validates: AC-TRG-001, BR-TRG-001
  @positive @smoke
  Scenario: COLLISION severity 8 auto-assigns to SENIOR_ADJUSTER
    Given a claim exists with lossType="COLLISION" and severityScore=8 and status="OPEN"
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the response status is 201
    And the new Assignment.assignmentType equals "AUTO"
    And the assigned user has role "SENIOR_ADJUSTER"
    And the Assignment.notes contains "Collision with severity >= 7"

  # Validates: BR-TRG-003
  @positive @regression
  Scenario: COLLISION severity 4 auto-assigns to ADJUSTER
    Given a claim exists with lossType="COLLISION" and severityScore=4
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the response status is 201
    And the assigned user has role "ADJUSTER"

  # Validates: BR-TRG-002 — per spec, ignoring BUG-002
  @positive @regression
  Scenario: THEFT severity 3 auto-assigns to SENIOR_ADJUSTER (per spec)
    Given a claim exists with lossType="THEFT" and severityScore=3
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the response status is 201
    And the assigned user has role "SENIOR_ADJUSTER"

  # Validates: BR-TRG-001 — boundary just below threshold
  @boundary @regression
  Scenario: COLLISION severity 6 auto-assigns to ADJUSTER (one below threshold)
    Given a claim exists with lossType="COLLISION" and severityScore=6
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the assigned user has role "ADJUSTER"

  # Validates: BR-TRG-001 — boundary at threshold
  @boundary @regression
  Scenario: COLLISION severity 7 auto-assigns to SENIOR_ADJUSTER (at threshold)
    Given a claim exists with lossType="COLLISION" and severityScore=7
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the assigned user has role "SENIOR_ADJUSTER"

  # Validates: AC-TRG-001 — non-existent claim
  @negative @regression
  Scenario: Assigning a non-existent claim returns an error
    When I POST to "/api/claims/9999999/assignments" with empty body
    Then the response status is 4xx (or 500 mapped from "Claim not found")
    And no Assignment row is inserted

  # Validates: AC-TRG-002 — invalid adjusterId on manual flow
  @negative @regression
  Scenario: Manual assignment with invalid adjusterId returns an error
    Given a claim exists with id=1
    When I POST to "/api/claims/1/assignments" with body { "adjusterId": 9999999 }
    Then the response status is 4xx (or 500 mapped from "User not found")
    And no Assignment row is inserted

  # Validates: BR-TRG-004 — fallback when no SENIOR_ADJUSTER candidates exist
  @exception @regression
  Scenario: Fallback to ADJUSTER when no candidates exist for required role
    Given there are no users with role "SENIOR_ADJUSTER" (database reset)
    And there is at least one user with role "ADJUSTER"
    And a claim exists with lossType="COLLISION" and severityScore=9
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the response status is 201
    And the assigned user has role "ADJUSTER"
    And the Assignment.assignmentType equals "AUTO"

  # Validates: AC-TRG-001 (authorization)
  @security @regression
  Scenario: Unauthenticated request cannot trigger auto-assignment
    Given the request has no Authorization header
    When I POST to "/api/claims/1/assignments" with empty body
    Then the response status is 401 Unauthorized
    And no Assignment row is inserted

  # Validates: BUG-002 — THEFT case-sensitivity in triage
  @bug @negative @regression @triage
  Scenario: BUG-002 — Uppercase THEFT must auto-assign to SENIOR_ADJUSTER, not ADJUSTER
    # Expected per spec: lossType="THEFT" (uppercase) auto-routes to SENIOR_ADJUSTER.
    # Actual today: ClaimService.autoAssignClaim uses "Theft".equals(...) so "THEFT" falls through
    #               to the default branch and is incorrectly routed to ADJUSTER.
    Given a claim exists with lossType="THEFT" (uppercase, matching seed data) and severityScore=9
    When I POST to "/api/claims/{claimId}/assignments" with empty body
    Then the assigned user has role "SENIOR_ADJUSTER"     # expected (per spec)
    But the current build assigns role "ADJUSTER"         # actual (BUG-002)
```

### Reserve Decision Feature

```gherkin
@feature @reserve @claim
Feature: Reserve decision — POST /api/claims/{id}/reserve-decision

  Background:
    Given a claim exists with id=10 in status "UNDER_INVESTIGATION"
    And the user "supervisor" is authenticated with role "SENIOR_ADJUSTER"

  # Validates: AC-RES-001
  @positive @smoke
  Scenario: APPROVE with explicit amount sets reserveAmount and status RESERVE_SET
    When I POST to "/api/claims/10/reserve-decision" with body { "decision": "APPROVE", "amount": 5000 }
    Then the response status is 200
    And claim 10 has status "RESERVE_SET"
    And claim 10 has reserveAmount=5000.00
    And a ClaimEvent of type "STATUS_CHANGE" with newStatus="RESERVE_SET" exists for claim 10

  # Validates: AC-RES-002
  @positive @regression
  Scenario: APPROVE without amount auto-calculates severity*1000*1.15
    Given the claim has severityScore=4
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE" }
    Then claim status equals "RESERVE_SET"
    And claim reserveAmount equals 4600.00

  # Validates: AC-RES-003
  @positive @regression
  Scenario: DENY transitions claim to DENIED status
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "DENY" }
    Then claim status equals "DENIED"
    And claim reserveAmount is null
    And a ClaimEvent of type "STATUS_CHANGE" with newStatus="DENIED" exists for the claim

  # Validates: AC-RES-002 — auto-calc lower bound
  @boundary @regression
  Scenario: Auto-calc at minimum severity 1
    Given the claim has severityScore=1
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE" }
    Then claim reserveAmount equals 1150.00

  # Validates: AC-RES-002 — auto-calc upper bound
  @boundary @regression
  Scenario: Auto-calc at maximum severity 10
    Given the claim has severityScore=10
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE" }
    Then claim reserveAmount equals 11500.00

  # Validates: AC-RES-001
  @negative @regression
  Scenario: APPROVE with negative amount is rejected
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE", "amount": -500 }
    Then the response status is 4xx
    And the claim status is unchanged

  # Validates: BR-RES-001 — illegal state transition
  @negative @regression
  Scenario: APPROVE on a closed claim is rejected
    Given the claim is in status "CLOSED"
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE", "amount": 1000 }
    Then the response status is 4xx
    And the claim status remains "CLOSED"
    And no new ClaimEvent is written

  # Validates: AC-RES-001 — non-existent claim
  @exception @regression
  Scenario: Reserve decision on non-existent claim returns an error
    When I POST to "/api/claims/9999999/reserve-decision" with body { "decision": "APPROVE", "amount": 1000 }
    Then the response status is 4xx (or 500 mapped from "Claim not found")
    And no ClaimEvent is written

  # Validates: AC-RES-001 (authorization)
  @security @regression
  Scenario: Only adjuster roles can post a reserve decision
    Given the request is authenticated as a non-adjuster user (role="VIEWER")
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE", "amount": 1000 }
    Then the response status is 403 Forbidden
    And the claim status is unchanged

  # Validates: BUG-003 — Reserve auto-calc rounding
  @bug @negative @regression @reserve
  Scenario: BUG-003 — Severity 3 auto-calc must equal 3450.00, not 3449
    # Expected per spec: BigDecimal half-up rounding so 3 * 1000 * 1.15 == 3450.00.
    # Actual today: double arithmetic plus (long) cast truncates 3449.999... to 3449.
    Given the claim has severityScore=3
    When I POST to "/api/claims/{claimId}/reserve-decision" with body { "decision": "APPROVE" }
    Then claim reserveAmount equals 3450.00      # expected (per spec)
    But the current build returns reserveAmount=3449   # actual (BUG-003)
```

### Settlement, Closure, Manual Assignment & State Transitions Feature

```gherkin
@feature @settlement @closure @audit @claim
Feature: Settlement, closure, manual assignment and lifecycle state transitions

  Background:
    Given the backend is running on port 8080
    And the seed data is loaded
    And the user "adjuster" is authenticated with role "ADJUSTER"

  # Validates: AC-SET-001
  @positive @smoke
  Scenario: Issue a payment on a claim with RESERVE_SET status
    Given a claim exists with id=3 in status "RESERVE_SET" and reserveAmount=3200.00
    When I POST to "/api/claims/3/payments" with body { "amount": 3200, "createdBy": "adjuster" }
    Then the response status is 201
    And the response body field "referenceNumber" matches the regex "^PAY-[A-F0-9]{8}$"
    And the response body field "status" equals "COMPLETED"
    And claim 3 status equals "SETTLED"
    And claim 3 settlementAmount equals 3200.00

  # Validates: AC-SET-002
  @positive @regression
  Scenario: Close a claim without subrogation
    Given a claim exists with id=4 in status "SETTLED"
    When I POST to "/api/claims/4/close" with empty body
    Then claim 4 status equals "CLOSED"
    And claim 4 subrogationFlag equals false

  # Validates: AC-SET-002 — subrogation persistence
  @positive @regression
  Scenario: Close a claim with subrogation=true
    Given a claim exists with id=4 in status "SETTLED"
    When I POST to "/api/claims/4/close" with body { "subrogation": true }
    Then claim 4 status equals "CLOSED"
    And claim 4 subrogationFlag equals true

  # Validates: AC-SET-003, AC-TRG-002
  @positive @regression
  Scenario: Manual assignment with a valid adjusterId
    Given a claim exists with id=1 in status "OPEN"
    And user with id=3 has role "SENIOR_ADJUSTER"
    When I POST to "/api/claims/1/assignments" with body { "adjusterId": 3, "notes": "Special handling" }
    Then the response status is 201
    And the new Assignment.assignmentType equals "MANUAL"
    And the new Assignment.adjusterId equals 3
    And the new Assignment.notes equals "Special handling"

  # Validates: BR-SET-001 — full happy path lifecycle
  @boundary @state-transition @regression
  Scenario: Full happy-path lifecycle OPEN → UNDER_INVESTIGATION → RESERVE_SET → SETTLED → CLOSED
    Given a fresh claim is created via FNOL with lossType="COLLISION" and severityScore=5
    When I PATCH "/api/claims/{id}/status" with status "UNDER_INVESTIGATION"
    And I POST "/api/claims/{id}/reserve-decision" with { "decision": "APPROVE", "amount": 5000 }
    And I POST "/api/claims/{id}/payments" with { "amount": 5000, "createdBy": "adjuster" }
    And I POST "/api/claims/{id}/close" with { "subrogation": false }
    Then ordered ClaimEvent rows exist with newStatus values: ["OPEN", "UNDER_INVESTIGATION", "RESERVE_SET", "SETTLED", "CLOSED"]
    And the final claim status equals "CLOSED"

  # Validates: BR-SET-002 — alternate denied path
  @boundary @state-transition @regression
  Scenario: Alternate path OPEN → DENIED on reserve denial
    Given a fresh claim is created via FNOL with lossType="WEATHER" and severityScore=2
    When I POST "/api/claims/{id}/reserve-decision" with { "decision": "DENY" }
    Then claim status equals "DENIED"
    And no Payment row exists for the claim
    And subsequent payment / close calls on the claim are rejected as illegal transitions

  # Validates: BR-SET-001 — illegal transition (pay before reserve)
  @negative @regression
  Scenario: Issuing payment before reserve is set is rejected
    Given a fresh claim exists in status "OPEN"
    When I POST to "/api/claims/{id}/payments" with body { "amount": 1000, "createdBy": "adjuster" }
    Then the response status is 4xx
    And the claim status remains "OPEN"
    And no Payment row is inserted

  # Validates: BR-SET-001 — illegal transition (close before pay)
  @negative @regression
  Scenario: Closing a claim before payment is issued is rejected
    Given a fresh claim exists in status "RESERVE_SET" with no payments
    When I POST to "/api/claims/{id}/close" with empty body
    Then the response status is 4xx
    And the claim status remains "RESERVE_SET"

  # Validates: BR-SET-001 — idempotency / illegal re-close
  @negative @regression
  Scenario: Double-close on the same claim is rejected
    Given a claim exists with id=5 in status "CLOSED"
    When I POST to "/api/claims/5/close" with empty body
    Then the response status is 4xx
    And no new ClaimEvent is written for claim 5

  # Validates: AC-SET-001 — payment resilience
  @exception @regression
  Scenario: Payment gateway timeout produces a recoverable error
    Given the downstream payment gateway is unreachable (simulate connection timeout)
    And a claim exists with id=3 in status "RESERVE_SET"
    When I POST to "/api/claims/3/payments" with body { "amount": 3200, "createdBy": "adjuster" }
    Then the response status is 5xx (e.g. 502 / 504)
    And claim 3 status remains "RESERVE_SET"
    And no Payment row is inserted (transaction rolled back)

  # Validates: AC-SET-001 + AC-SET-002 (authorization)
  @security @regression
  Scenario: Only authorized adjuster roles can issue payment or close claims
    Given the authenticated user has role "VIEWER"
    When I POST to "/api/claims/3/payments" with body { "amount": 100 }
    Then the response status is 403 Forbidden
    When I POST to "/api/claims/4/close" with body { "subrogation": false }
    Then the response status is 403 Forbidden
    And no Payment, Claim status change, or ClaimEvent rows are written
```

## Traditional Test Cases

| Test Case ID    | AC/Rule       | Type      | Title                                                                 | Preconditions                                                                                              | Steps                                                                                                                                                                                                                                                                                                          | Expected Result                                                                                                                                                                                          | Priority |
|-----------------|---------------|-----------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| TC-FNOL-001     | AC-FNOL-001/002/003 | Positive  | Submit valid COLLISION FNOL with severity 5 returns 201 and writes audit event | Backend running; seed data loaded; policy id=1 exists                                                      | 1. POST `/api/claims` with `{policyId:1, lossType:"COLLISION", severityScore:5, lossDate:"2025-01-12", lossDescription:"Rear-end collision...", claimantName:"Alice Henderson", claimantPhone:"555-0101"}`<br/>2. Read `claim_event` rows for new claim                                                        | Status 201; `claimNumber` matches `^CLM-[A-F0-9]{8}$`; `status="OPEN"`; one new ClaimEvent with `eventType="STATUS_CHANGE"`, `newStatus="OPEN"`, `notes="FNOL submitted"`                                | P1       |
| TC-FNOL-002     | AC-FNOL-001   | Positive  | Submit valid THEFT FNOL with severity 3                               | Policy id=2 exists                                                                                         | 1. POST `/api/claims` with valid body, `lossType="THEFT"`, `severityScore=3`                                                                                                                                                                                                                                   | Status 201; persisted `lossType="THEFT"` (uppercase preserved); `severityScore=3`                                                                                                                       | P2       |
| TC-FNOL-003     | AC-FNOL-001   | Positive  | Submit valid WEATHER FNOL with severity 2                             | Policy id=4 exists                                                                                         | 1. POST `/api/claims` with valid body, `lossType="WEATHER"`, `severityScore=2`                                                                                                                                                                                                                                 | Status 201; `status="OPEN"` and ClaimEvent `STATUS_CHANGE → OPEN` written                                                                                                                                | P2       |
| TC-FNOL-004     | AC-FNOL-003   | Negative  | Reject FNOL with missing `policyId`                                   | Backend running                                                                                            | 1. POST `/api/claims` with body omitting `policyId`                                                                                                                                                                                                                                                            | Status 4xx; no `claim` row inserted; no `claim_event` row inserted                                                                                                                                       | P1       |
| TC-FNOL-005     | AC-FNOL-005   | Negative  | Reject FNOL with non-existent `policyId`                              | Policy id=999999 does NOT exist                                                                            | 1. POST `/api/claims` with `policyId=999999` and otherwise valid body                                                                                                                                                                                                                                          | Status 4xx; error message contains `Policy not found`; no claim row inserted                                                                                                                             | P1       |
| TC-FNOL-006     | AC-FNOL-003   | Negative  | Reject FNOL with missing `lossType`                                   | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with body omitting `lossType`                                                                                                                                                                                                                                                            | Status 4xx; no claim row inserted                                                                                                                                                                        | P2       |
| TC-FNOL-007     | AC-FNOL-003   | Negative  | Reject FNOL with missing `lossDescription`                            | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with body omitting `lossDescription`                                                                                                                                                                                                                                                     | Status 4xx; no claim row inserted                                                                                                                                                                        | P2       |
| TC-FNOL-008     | AC-FNOL-004   | Negative  | Reject FNOL with negative severity                                    | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with `severityScore=-1`                                                                                                                                                                                                                                                                  | Status 4xx; no claim row inserted                                                                                                                                                                        | P2       |
| TC-FNOL-009     | AC-FNOL-004   | Boundary  | Severity 0 (just below minimum) is rejected for non-OTHER loss types  | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with `severityScore=0`, `lossType="COLLISION"`                                                                                                                                                                                                                                           | Status 4xx; no claim row inserted                                                                                                                                                                        | P1       |
| TC-FNOL-010     | AC-FNOL-004   | Boundary  | Severity 1 (minimum allowed) is accepted                              | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with `severityScore=1`, `lossType="COLLISION"`                                                                                                                                                                                                                                           | Status 201; persisted `severityScore=1`                                                                                                                                                                  | P1       |
| TC-FNOL-011     | AC-FNOL-004   | Boundary  | Severity 10 (maximum allowed) is accepted                             | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with `severityScore=10`, `lossType="COLLISION"`                                                                                                                                                                                                                                          | Status 201; persisted `severityScore=10`                                                                                                                                                                 | P1       |
| TC-FNOL-012     | AC-FNOL-004   | Boundary  | Severity 11 (just above maximum) is rejected                          | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with `severityScore=11`, `lossType="COLLISION"`                                                                                                                                                                                                                                          | Status 4xx; no claim row inserted                                                                                                                                                                        | P1       |
| TC-FNOL-013     | AC-FNOL-001   | Exception | DB outage during FNOL persist rolls back the transaction              | Database connection forced unreachable (e.g. Hikari pool exhausted, H2 stopped)                            | 1. POST `/api/claims` with a valid body                                                                                                                                                                                                                                                                        | Status 5xx; no `claim` and no `claim_event` rows inserted; transaction is rolled back atomically                                                                                                          | P2       |
| TC-FNOL-014     | AC-FNOL-005   | Security  | IDOR — user A cannot create a claim against user B's policyId         | Authenticated user owns policy id=1; policy id=2 belongs to a different holder                            | 1. POST `/api/claims` as user-A with `policyId=2`                                                                                                                                                                                                                                                              | Status 403 (or 404 under per-user policy scoping); no claim row inserted                                                                                                                                  | P1       |
| TC-FNOL-015     | BUG-001       | Negative  | BUG-001 — FNOL must reject `lossType=OTHER` with severity=0 and missing description | Policy id=1 exists                                                                                         | 1. POST `/api/claims` with `lossType="OTHER"`, `severityScore=0`, no `lossDescription`, empty `claimantName`                                                                                                                                                                                                   | **Expected**: status 4xx and no claim inserted (per spec).<br/>**Actual (BUG-001)**: frontend FNOL form short-circuits validity when `lossType==='OTHER'` and severity defaults to 0, so a malformed claim is persisted. | P1       |
| TC-TRIAGE-001   | AC-TRG-001 / BR-TRG-001 | Positive  | Auto-assign COLLISION severity 8 to SENIOR_ADJUSTER                   | Seed data loaded; SENIOR_ADJUSTER user(s) exist; claim with `lossType="COLLISION"`, `severityScore=8` exists | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | Status 201; `Assignment.assignmentType="AUTO"`; assigned user has role `SENIOR_ADJUSTER`; notes contain `Collision with severity >= 7`                                                                    | P1       |
| TC-TRIAGE-002   | BR-TRG-003    | Positive  | Auto-assign COLLISION severity 4 to ADJUSTER                          | Claim with `lossType="COLLISION"`, `severityScore=4` exists                                                | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | Status 201; assigned user has role `ADJUSTER`                                                                                                                                                            | P2       |
| TC-TRIAGE-003   | BR-TRG-002    | Positive  | Per spec, THEFT severity 3 auto-assigns to SENIOR_ADJUSTER            | Claim with `lossType="THEFT"`, `severityScore=3` exists                                                    | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | Status 201; assigned user has role `SENIOR_ADJUSTER` (per BR-TRG-002, ignoring BUG-002)                                                                                                                  | P1       |
| TC-TRIAGE-004   | BR-TRG-001    | Boundary  | COLLISION severity 6 (one below threshold) auto-assigns to ADJUSTER   | Claim with `lossType="COLLISION"`, `severityScore=6` exists                                                | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | Assigned user has role `ADJUSTER`                                                                                                                                                                        | P1       |
| TC-TRIAGE-005   | BR-TRG-001    | Boundary  | COLLISION severity 7 (at threshold) auto-assigns to SENIOR_ADJUSTER   | Claim with `lossType="COLLISION"`, `severityScore=7` exists                                                | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | Assigned user has role `SENIOR_ADJUSTER`                                                                                                                                                                 | P1       |
| TC-TRIAGE-006   | AC-TRG-001    | Negative  | Auto-assign on a non-existent claim id returns an error               | No claim with id=9999999                                                                                   | 1. POST `/api/claims/9999999/assignments` with empty body                                                                                                                                                                                                                                                      | Status 4xx (or 500 mapped from `Claim not found`); no Assignment row inserted                                                                                                                            | P2       |
| TC-TRIAGE-007   | AC-TRG-002    | Negative  | Manual assignment with invalid `adjusterId` returns an error          | Claim id=1 exists; no user with id=9999999                                                                 | 1. POST `/api/claims/1/assignments` with body `{adjusterId:9999999}`                                                                                                                                                                                                                                           | Status 4xx (or 500 mapped from `User not found`); no Assignment row inserted                                                                                                                              | P2       |
| TC-TRIAGE-008   | BR-TRG-004    | Exception | Fallback to ADJUSTER when no candidates exist for SENIOR_ADJUSTER     | All `SENIOR_ADJUSTER` users removed; at least one `ADJUSTER` exists; claim with `lossType="COLLISION"`, `severityScore=9` | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | Status 201; assigned user has role `ADJUSTER`; `assignmentType="AUTO"`                                                                                                                                   | P2       |
| TC-TRIAGE-009   | AC-TRG-001    | Security  | Unauthenticated request cannot trigger auto-assignment                | No Authorization header on the request                                                                     | 1. POST `/api/claims/1/assignments` with empty body and no auth                                                                                                                                                                                                                                                | Status 401 Unauthorized; no Assignment row inserted                                                                                                                                                      | P1       |
| TC-TRIAGE-010   | BUG-002       | Negative  | BUG-002 — Uppercase `THEFT` claim must auto-assign to SENIOR_ADJUSTER | Seed data uses uppercase `"THEFT"`; claim with `lossType="THEFT"`, `severityScore=9` exists                | 1. POST `/api/claims/{id}/assignments` with empty body                                                                                                                                                                                                                                                         | **Expected**: assigned user role = `SENIOR_ADJUSTER` (per BR-TRG-002).<br/>**Actual (BUG-002)**: `ClaimService.autoAssignClaim` does `"Theft".equals(claim.getLossType())`, so uppercase `"THEFT"` falls through and is assigned `ADJUSTER` instead. | P1       |
| TC-RESERVE-001  | AC-RES-001    | Positive  | APPROVE with explicit amount sets reserveAmount and status            | Claim id=10 exists in status `UNDER_INVESTIGATION`                                                         | 1. POST `/api/claims/10/reserve-decision` with `{decision:"APPROVE", amount:5000}`                                                                                                                                                                                                                              | Status 200; claim 10 has `status="RESERVE_SET"`; `reserveAmount=5000.00`; ClaimEvent `STATUS_CHANGE → RESERVE_SET` written                                                                              | P1       |
| TC-RESERVE-002  | AC-RES-002    | Positive  | APPROVE without amount auto-calcs severity*1000*1.15                  | Claim with `severityScore=4` exists in status `UNDER_INVESTIGATION`                                        | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE"}`                                                                                                                                                                                                                                        | `reserveAmount=4600.00`; `status="RESERVE_SET"`                                                                                                                                                          | P1       |
| TC-RESERVE-003  | AC-RES-003    | Positive  | DENY transitions claim to DENIED                                      | Claim exists in status `UNDER_INVESTIGATION`                                                               | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"DENY"}`                                                                                                                                                                                                                                           | `status="DENIED"`; `reserveAmount` remains null/zero; ClaimEvent `STATUS_CHANGE → DENIED` written                                                                                                       | P1       |
| TC-RESERVE-004  | AC-RES-002    | Boundary  | Auto-calc lower bound: severity 1 → reserveAmount 1150.00             | Claim with `severityScore=1` exists                                                                        | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE"}`                                                                                                                                                                                                                                        | `reserveAmount=1150.00`                                                                                                                                                                                  | P1       |
| TC-RESERVE-005  | AC-RES-002    | Boundary  | Auto-calc upper bound: severity 10 → reserveAmount 11500.00           | Claim with `severityScore=10` exists                                                                       | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE"}`                                                                                                                                                                                                                                        | `reserveAmount=11500.00`                                                                                                                                                                                 | P1       |
| TC-RESERVE-006  | AC-RES-001    | Negative  | APPROVE with negative amount is rejected                              | Claim exists                                                                                               | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE", amount:-500}`                                                                                                                                                                                                                           | Status 4xx; claim status unchanged; no ClaimEvent written                                                                                                                                                | P2       |
| TC-RESERVE-007  | BR-RES-001    | Negative  | APPROVE on a closed claim is rejected                                 | Claim id=5 in status `CLOSED`                                                                              | 1. POST `/api/claims/5/reserve-decision` with `{decision:"APPROVE", amount:1000}`                                                                                                                                                                                                                              | Status 4xx; status remains `CLOSED`; no new ClaimEvent                                                                                                                                                   | P2       |
| TC-RESERVE-008  | AC-RES-001    | Exception | Reserve decision on non-existent claim returns an error               | No claim with id=9999999                                                                                   | 1. POST `/api/claims/9999999/reserve-decision` with `{decision:"APPROVE", amount:1000}`                                                                                                                                                                                                                        | Status 4xx (or 500 mapped from `Claim not found`); no ClaimEvent written                                                                                                                                  | P2       |
| TC-RESERVE-009  | AC-RES-001    | Security  | Only adjuster roles can post a reserve decision                       | Authenticated user has role `VIEWER`                                                                       | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE", amount:1000}`                                                                                                                                                                                                                           | Status 403 Forbidden; claim status unchanged                                                                                                                                                             | P1       |
| TC-RESERVE-010  | BUG-003       | Negative  | BUG-003 — Severity 3 auto-calc must equal 3450.00, not 3449           | Claim with `severityScore=3` exists in status `UNDER_INVESTIGATION`                                        | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE"}`                                                                                                                                                                                                                                        | **Expected**: `reserveAmount=3450.00` (BigDecimal half-up rounding).<br/>**Actual (BUG-003)**: `double` arithmetic + `(long)` cast yields `reserveAmount=3449`.                                          | P1       |
| TC-SETTLE-001   | AC-SET-001    | Positive  | Issue payment on RESERVE_SET claim transitions to SETTLED             | Claim id=3 in status `RESERVE_SET` with `reserveAmount=3200.00`                                            | 1. POST `/api/claims/3/payments` with `{amount:3200, createdBy:"adjuster"}`<br/>2. GET `/api/claims/3`                                                                                                                                                                                                          | Status 201; payment `referenceNumber` matches `^PAY-[A-F0-9]{8}$`; payment `status="COMPLETED"`; claim 3 `status="SETTLED"`; claim 3 `settlementAmount=3200.00`                                       | P1       |
| TC-SETTLE-002   | AC-SET-002    | Positive  | Close a SETTLED claim without subrogation                             | Claim id=4 in status `SETTLED`                                                                             | 1. POST `/api/claims/4/close` with empty body                                                                                                                                                                                                                                                                  | Claim 4 `status="CLOSED"`; `subrogationFlag=false`                                                                                                                                                       | P1       |
| TC-SETTLE-003   | AC-SET-002    | Positive  | Close a SETTLED claim with subrogation=true                           | Claim id=4 in status `SETTLED`                                                                             | 1. POST `/api/claims/4/close` with `{subrogation:true}`                                                                                                                                                                                                                                                        | Claim 4 `status="CLOSED"`; `subrogationFlag=true`                                                                                                                                                        | P1       |
| TC-SETTLE-004   | AC-SET-003 / AC-TRG-002 | Positive  | Manual assignment with valid `adjusterId`                             | Claim id=1 exists; user id=3 has role `SENIOR_ADJUSTER`                                                    | 1. POST `/api/claims/1/assignments` with `{adjusterId:3, notes:"Special handling"}`                                                                                                                                                                                                                            | Status 201; new Assignment `assignmentType="MANUAL"`, `adjusterId=3`, `notes="Special handling"`                                                                                                       | P2       |
| TC-SETTLE-005   | BR-SET-001    | Boundary  | Full happy-path lifecycle OPEN → UNDER_INVESTIGATION → RESERVE_SET → SETTLED → CLOSED | Fresh FNOL (`lossType="COLLISION"`, `severityScore=5`) created for an existing policy                       | 1. PATCH `/api/claims/{id}/status` with `status="UNDER_INVESTIGATION"`<br/>2. POST `/api/claims/{id}/reserve-decision` with `{decision:"APPROVE", amount:5000}`<br/>3. POST `/api/claims/{id}/payments` with `{amount:5000, createdBy:"adjuster"}`<br/>4. POST `/api/claims/{id}/close` with `{subrogation:false}` | Ordered ClaimEvent rows (`newStatus`): `OPEN`, `UNDER_INVESTIGATION`, `RESERVE_SET`, `SETTLED`, `CLOSED`. Final claim status `CLOSED`.                                                                  | P1       |
| TC-SETTLE-006   | BR-SET-002    | Boundary  | Alternate path OPEN → DENIED via reserve denial                       | Fresh FNOL (`lossType="WEATHER"`, `severityScore=2`)                                                       | 1. POST `/api/claims/{id}/reserve-decision` with `{decision:"DENY"}`<br/>2. Attempt POST `/api/claims/{id}/payments`<br/>3. Attempt POST `/api/claims/{id}/close`                                                                                                                                              | After step 1: `status="DENIED"`. Steps 2 and 3 are rejected (4xx); status remains `DENIED`. No Payment row exists.                                                                                       | P1       |
| TC-SETTLE-007   | BR-SET-001    | Negative  | Issuing payment before reserve is set is rejected                     | Fresh claim in status `OPEN` with no reserve                                                               | 1. POST `/api/claims/{id}/payments` with `{amount:1000, createdBy:"adjuster"}`                                                                                                                                                                                                                                  | Status 4xx; claim status remains `OPEN`; no Payment row inserted                                                                                                                                         | P2       |
| TC-SETTLE-008   | BR-SET-001    | Negative  | Closing a claim before payment is issued is rejected                  | Fresh claim in status `RESERVE_SET` with no payments                                                       | 1. POST `/api/claims/{id}/close` with empty body                                                                                                                                                                                                                                                               | Status 4xx; claim status remains `RESERVE_SET`                                                                                                                                                          | P2       |
| TC-SETTLE-009   | BR-SET-001    | Negative  | Double-close on the same claim is rejected                            | Claim id=5 already in status `CLOSED`                                                                      | 1. POST `/api/claims/5/close` with empty body                                                                                                                                                                                                                                                                  | Status 4xx; no new ClaimEvent for claim 5                                                                                                                                                                | P2       |
| TC-SETTLE-010   | AC-SET-001    | Exception | Payment gateway timeout produces a recoverable error                  | Downstream payment gateway unreachable (simulate connection timeout); claim id=3 in status `RESERVE_SET`   | 1. POST `/api/claims/3/payments` with `{amount:3200, createdBy:"adjuster"}`                                                                                                                                                                                                                                    | Status 5xx (e.g. 502 / 504); claim 3 status remains `RESERVE_SET`; no Payment row inserted (transaction rolled back)                                                                                     | P2       |
| TC-SETTLE-011   | AC-SET-001 / AC-SET-002 | Security  | Only authorized adjuster roles can issue payment or close claims      | Authenticated user has role `VIEWER`                                                                       | 1. POST `/api/claims/3/payments` with `{amount:100}`<br/>2. POST `/api/claims/4/close` with `{subrogation:false}`                                                                                                                                                                                              | Both calls return 403 Forbidden; no Payment row inserted; no claim status change; no ClaimEvent rows added                                                                                              | P1       |

## Known Defects Covered

| Defect    | Description                                                                                              | Test Case IDs        |
|-----------|----------------------------------------------------------------------------------------------------------|----------------------|
| BUG-001   | FNOL validation bypass when `lossType=OTHER` allows severity=0 / missing required fields to persist.     | TC-FNOL-015          |
| BUG-002   | `ClaimService.autoAssignClaim` compares to `"Theft"` but seed/enum uses `"THEFT"` ⇒ wrong role assigned. | TC-TRIAGE-010        |
| BUG-003   | Reserve auto-calc uses `double` + `(long)` cast, truncating values such as severity 3 → 3449 vs 3450.00. | TC-RESERVE-010       |

## QA Review Checklist

### Step 1: Coverage Review
- [ ] All acceptance criteria have at least one positive test case (AC-FNOL-001..005, AC-TRG-001..002, AC-RES-001..003, AC-SET-001..003)
- [ ] All required FNOL fields have a "missing required field" negative test case (`policyId`, `lossType`, `lossDescription`)
- [ ] All status values are covered in boundary/state-transition tests (`OPEN`, `UNDER_INVESTIGATION`, `RESERVE_SET`, `SETTLED`, `CLOSED`, `DENIED`)
- [ ] Security scenarios cover authentication and authorization at each lifecycle boundary (FNOL IDOR, triage auth, reserve role, payment/close role)
- [ ] Known defects (BUG-001, BUG-002, BUG-003) are explicitly covered in both BDD and tabular sections

### Step 2: Quality Review
- [ ] Each test case has a clear, single expected result
- [ ] Preconditions are specific and achievable (reference concrete claim/policy/user ids from `data.sql` where applicable)
- [ ] Steps are action-oriented (HTTP verb + URL + body), not implementation-specific
- [ ] Test data is realistic and varied (multiple `lossType` values, severity range 0..11, multiple policies)

### Step 3: BDD Review
- [ ] Each scenario is independently runnable (use `Background` only for shared setup)
- [ ] Background steps apply to all scenarios in the file
- [ ] Step definitions can be reused across feature files (HTTP step library, claim factory step library)
- [ ] Data tables are used for multi-value inputs (see severity bracket `Scenario Outline` in the FNOL feature)

### Step 4: Refinement Prompts
Use prompts of the form:
"Review the generated test cases in `docs/test-cases/claims-processing-test-cases.md`. Identify gaps for AC-FNOL-004 severity validation. Add N boundary tests for `severityScore` covering decimal/non-integer inputs. Rewrite TC-FNOL-013 to specify the exact `5xx` body shape produced by the global exception handler. Convert TC-RESERVE-006..TC-RESERVE-008 to BDD format. Verify all test case IDs follow the TC-{FNOL|TRIAGE|RESERVE|SETTLE}-NNN pattern."
