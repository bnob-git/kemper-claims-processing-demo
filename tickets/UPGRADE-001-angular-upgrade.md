# UPGRADE-001: Upgrade Angular from v17 to v19

**Type:** Upgrade / Modernization
**Priority:** High
**Component:** Frontend

## Summary
Upgrade the Angular frontend from version 17.3.x to the latest Angular 19.x release, including all Angular dependencies, Angular Material, and Angular CDK.

## Description
The frontend is currently pinned to Angular 17.3.12. Angular 19 includes:
- Improved signal-based reactivity
- Enhanced SSR support
- New control flow syntax (`@if`, `@for`) replacing `*ngIf`, `*ngFor`
- Performance improvements
- Updated dependency requirements

This upgrade should be performed incrementally (17 → 18 → 19) following the official Angular Update Guide.

## Acceptance Criteria
- [ ] Upgrade Angular core packages from 17.3.x to 19.x
- [ ] Upgrade Angular Material and CDK to matching 19.x version
- [ ] Upgrade TypeScript to the version required by Angular 19
- [ ] Upgrade `zone.js` to the compatible version
- [ ] Upgrade `@angular-devkit/build-angular` and `@angular/cli`
- [ ] Upgrade `@angular-eslint` packages to compatible versions
- [ ] Run `ng update` for each major version step
- [ ] Fix any breaking changes in templates, components, or services
- [ ] All existing unit tests pass after upgrade
- [ ] All existing E2E tests pass after upgrade
- [ ] ESLint runs without new errors introduced by the upgrade
- [ ] Build succeeds in both development and production modes

## Notes
- Follow https://angular.dev/update-guide for each version step
- The `RouterTestingModule` used in tests is deprecated in Angular 18+; replace with `provideRouter` in test providers
- Angular Material may have breaking changes in component APIs between major versions
- Pin all versions tightly after upgrade

## Demo Relevance
This is the primary upgrade demo ticket for Devin. It tests the agent's ability to perform a multi-step framework upgrade, resolve breaking changes, and verify via tests.
