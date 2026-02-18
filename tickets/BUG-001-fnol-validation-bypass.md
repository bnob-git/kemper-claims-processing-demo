# BUG-001: FNOL Form Validation Bypass for "OTHER" Loss Type

**Type:** Bug
**Priority:** High
**Component:** Frontend — FNOL Form

## Summary
When the loss type is set to "OTHER", the FNOL form bypasses all validation and allows submission with missing or invalid fields, including severity score of 0 or negative values.

## Description
The FNOL form's `onSubmit()` method contains a logical OR condition that short-circuits the `this.fnolForm.valid` check when `lossType === 'OTHER'`. This means a user can submit a claim with:
- Empty claimant name
- Missing loss date
- Severity score of 0 (which is set as a default fallback)

The severity score defaults to `0` via `formValue.severityScore || 0` which also coerces a valid `null` to `0` instead of properly flagging validation failure.

## Steps to Reproduce
1. Navigate to the FNOL form (`/fnol`)
2. Select any Policy
3. Select "Other" as the Loss Type
4. Leave all other fields empty
5. Click "Submit FNOL"
6. Observe: Claim is created with severity 0, empty claimant name, etc.

## Expected Behavior
- Form should not submit unless all required fields are filled
- Severity score must be between 1 and 10 regardless of loss type
- The `|| 'OTHER'` bypass should be removed

## Acceptance Criteria
- [ ] Remove the `|| this.fnolForm.get('lossType')?.value === 'OTHER'` bypass in `onSubmit()`
- [ ] Ensure `severityScore` does not default to 0; use proper null handling
- [ ] Add a unit test that verifies the form does NOT submit with invalid fields when loss type is OTHER
- [ ] Existing E2E smoke test still passes after the fix

## Notes
This was likely a debugging shortcut that was accidentally left in. The fix is small but important for data integrity.

## Demo Relevance
This is a seeded defect for the Devin upgrade demo. It demonstrates a realistic validation edge case that an autonomous agent should be able to identify, fix, and verify with tests.
