# LINT-001: Fix Static Analysis and Lint Issues

**Type:** Code Quality
**Priority:** Low
**Component:** Backend + Frontend

## Summary
Fix all static analysis warnings and lint violations across the codebase that were identified by Checkstyle (backend) and ESLint (frontend).

## Description

### Backend (Checkstyle)
1. **Unused field** in `ClaimService.java`: `lastProcessedClaimId` is declared but never read. Remove it.
2. **Method complexity**: The `setReserveDecision` method may exceed the configured cyclomatic complexity threshold once the rounding bug is fixed. Consider extracting the auto-calculation into a separate private method.

### Frontend (ESLint)
1. **`no-console` violations**: `console.log` calls in `FnolFormComponent.onSubmit()` and error handler. Replace with a proper logging approach or remove.
2. **`no-unused-vars` violation**: `debugMode` field in `FnolFormComponent` is declared but never used. Remove it.
3. **Deprecated API usage**: `RouterTestingModule` (used in test files) is deprecated in newer Angular versions. Replace with `provideRouter([])` in test providers. (Note: this may be addressed as part of the Angular upgrade ticket.)

## Acceptance Criteria
- [ ] `mvn checkstyle:check` passes with zero violations
- [ ] `npm run lint` passes with zero errors
- [ ] No functional behavior changes — only code quality improvements
- [ ] All existing tests still pass after changes

## Notes
Run `mvn checkstyle:check -f backend/pom.xml` and `cd frontend && npm run lint` to verify.

## Demo Relevance
This ticket demonstrates routine code quality maintenance. An autonomous agent should be able to run the linters, interpret the output, and apply targeted fixes.
