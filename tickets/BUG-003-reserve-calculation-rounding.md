# BUG-003: Reserve Auto-Calculation Rounding Error

**Type:** Bug
**Priority:** Medium
**Component:** Backend — ClaimService

## Summary
When a reserve decision is approved without a specified amount, the auto-calculation uses `double` arithmetic instead of `BigDecimal`, causing rounding errors for certain severity values.

## Description
In `ClaimService.setReserveDecision()`, the auto-calculation path uses:
```java
double calculated = severityMultiplier * baseAmount * adjustmentFactor;
reserveAmount = BigDecimal.valueOf((long) calculated);
```
The `(long)` cast truncates instead of rounding. For severity 3: `3 * 1000 * 1.15 = 3449.9999...` which truncates to `3449` instead of `3450`.

## Steps to Reproduce
1. Create a claim with severity score 3
2. POST to `/api/claims/{id}/reserve-decision` with `{"decision": "APPROVE"}` (no amount)
3. Observe: reserve is set to $3449 instead of $3450

## Expected Behavior
Reserve should be calculated as `severity * 1000 * 1.15` using `BigDecimal` arithmetic, yielding exact results.

## Acceptance Criteria
- [ ] Replace `double` arithmetic with `BigDecimal` operations in the auto-calculation path
- [ ] Unit test `testReserveDecision_AutoCalculation_RoundingBug_Severity3` should pass
- [ ] Verify all severity values 1-10 produce correct results
- [ ] No regression in the explicit-amount path

## Notes
The unit test `testReserveDecision_AutoCalculation_RoundingBug_Severity3` already exposes this bug.

## Demo Relevance
Seeded defect demonstrating a classic floating-point precision issue. Good candidate for autonomous fix + regression test verification.
