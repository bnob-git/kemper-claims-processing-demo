# BUG-002: Triage Assignment Rule — Theft Case Sensitivity Mismatch

**Type:** Bug
**Priority:** High
**Component:** Backend — ClaimService

## Summary
THEFT claims are incorrectly assigned to a regular Adjuster instead of a Senior Adjuster because the triage rule compares against `"Theft"` (mixed case) instead of `"THEFT"` (uppercase enum value).

## Description
In `ClaimService.autoAssignClaim()`, the triage logic checks:
```java
} else if ("Theft".equals(claim.getLossType())) {
```
However, all loss types are stored as uppercase enum values (`COLLISION`, `THEFT`, `WEATHER`, etc.). The string comparison fails because `"Theft" != "THEFT"`, causing theft claims to fall through to the default `ADJUSTER` assignment.

## Steps to Reproduce
1. Create a new claim via FNOL with `lossType = THEFT` and any severity
2. Trigger auto-assignment via POST `/api/claims/{id}/assignments` (empty body)
3. Observe: Claim is assigned to a user with role `ADJUSTER` instead of `SENIOR_ADJUSTER`

## Expected Behavior
THEFT claims should always be assigned to a `SENIOR_ADJUSTER`, regardless of severity.

## Acceptance Criteria
- [ ] Fix the string comparison to use `"THEFT"` (uppercase) in `ClaimService.autoAssignClaim()`
- [ ] The unit test `testTriageAssignment_Theft_ShouldAssignSeniorAdjuster` should pass after the fix
- [ ] No regression in other triage rules (COLLISION high severity, standard assignment)
- [ ] Consider using `.equalsIgnoreCase()` for robustness

## Notes
The existing unit test `testTriageAssignment_Theft_ShouldAssignSeniorAdjuster` in `ClaimServiceTest.java` already covers this case and will fail, confirming the bug.

## Demo Relevance
This is a seeded backend defect for the Devin upgrade demo. It demonstrates a subtle string comparison bug that is caught by an existing unit test.
