# UPGRADE-002: Update Backend and Frontend Dependencies

**Type:** Upgrade / Modernization
**Priority:** Medium
**Component:** Backend + Frontend

## Summary
Update outdated dependencies across the stack to their latest compatible versions, addressing security vulnerabilities and deprecations.

## Description
Several dependencies are pinned to older versions that should be updated:

### Backend
- Spring Boot 3.2.5 → latest 3.3.x or 3.4.x
- springdoc-openapi 2.5.0 → latest 2.x
- H2 database to latest compatible version
- Maven Checkstyle plugin to latest

### Frontend
- RxJS 7.8.1 → latest 7.x
- tslib 2.6.3 → latest 2.x
- ESLint 8.57 → ESLint 9.x (flat config migration)
- Karma and Jasmine to latest compatible versions
- Playwright to latest

## Acceptance Criteria
- [ ] Update all backend dependencies listed above
- [ ] Update all frontend dependencies listed above
- [ ] Run `mvn verify` — all backend tests pass
- [ ] Run `npm test` — all frontend tests pass
- [ ] Run `npm run lint` — no new lint errors introduced
- [ ] Run `npm run build` — production build succeeds
- [ ] Checkstyle still runs and reports correctly
- [ ] Document any breaking changes encountered and how they were resolved

## Notes
- Be careful with ESLint 9 migration — it uses flat config format instead of `.eslintrc.json`. This may be deferred if Angular ESLint doesn't yet support ESLint 9 for the target Angular version.
- Spring Boot minor version upgrades are usually safe but check release notes for any breaking changes.

## Demo Relevance
This ticket tests the agent's ability to perform routine dependency maintenance across a polyglot monorepo, a common real-world task.
