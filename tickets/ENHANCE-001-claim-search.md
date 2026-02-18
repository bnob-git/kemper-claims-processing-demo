# ENHANCE-001: Add Claim Search and Advanced Filtering

**Type:** Enhancement
**Priority:** Medium
**Component:** Frontend — Dashboard

## Summary
Add a text search field and additional filters (loss type, date range) to the Claims Dashboard to improve adjuster productivity.

## Description
Currently the dashboard only supports filtering by claim status. Adjusters need to quickly find claims by:
- Claim number (partial match)
- Claimant name
- Policy number
- Loss type (dropdown multi-select)
- Date range (loss date from/to)

## Acceptance Criteria
- [ ] Add a text search field that filters claims by claim number, claimant name, or policy number
- [ ] Add a loss type multi-select filter
- [ ] Add date range pickers for loss date filtering
- [ ] Search should be debounced (300ms) to avoid excessive API calls
- [ ] Backend: Add query parameters to `GET /api/claims` for the new filters
- [ ] Filters should be combinable (AND logic)
- [ ] Unit test for the backend query filtering
- [ ] Dashboard component test for the search/filter UI

## Notes
Consider using Angular Material's autocomplete for the text search. Backend filtering can use Spring Data JPA Specifications or simple query methods.

## Demo Relevance
This enhancement ticket demonstrates a realistic feature request that Devin could implement end-to-end, touching both frontend and backend.
