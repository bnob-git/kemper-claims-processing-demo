# TEST-001: Expand Regression Test Suite

**Type:** Testing
**Priority:** Medium
**Component:** Backend + Frontend

## Summary
Expand the existing test suite to improve coverage of critical claim processing paths and edge cases.

## Description
The current test suite covers basic happy paths but lacks coverage for:

### Backend Tests Needed
- FNOL creation with missing required fields (expect validation error)
- Reserve decision DENY path (verify status change to DENIED)
- Payment issuance on a claim that is not in RESERVE_SET status (expect error)
- Closing a claim that is not in SETTLED status (expect error)
- Manual assignment with invalid adjuster ID (expect error)
- Concurrent status updates (optimistic locking)
- API integration tests for all controller endpoints

### Frontend Tests Needed
- FnolFormComponent: test form validation (all required fields)
- FnolFormComponent: test submission success and navigation
- ClaimDetailComponent: test tab rendering with mock data
- SettlementComponent: test payment issuance flow
- TriageComponent: test auto vs manual assignment toggle
- Service tests: verify HTTP calls with correct URLs and payloads

### E2E Tests Needed
- Test the full workflow with subrogation flag enabled
- Test filtering claims by status on the dashboard
- Test document upload in claim detail
- Test manual assignment override

## Acceptance Criteria
- [ ] Add at least 5 new backend unit tests covering error/edge cases
- [ ] Add at least 3 new frontend component tests
- [ ] Add at least 2 new E2E test scenarios
- [ ] All tests pass in CI
- [ ] Code coverage report shows improvement (aim for >70% line coverage on services)

## Notes
Use the existing test patterns and frameworks already in place (JUnit 5 / Spring Boot Test for backend, Karma/Jasmine for frontend unit tests, Playwright for E2E).

## Demo Relevance
This ticket tests the agent's ability to write meaningful tests that cover real business logic, not just boilerplate.
