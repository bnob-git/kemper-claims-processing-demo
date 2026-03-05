# UPGRADE-002: Update Backend and Frontend Dependencies

**Type:** Upgrade / Modernization
**Priority:** Medium
**Component:** Backend + Frontend
**Repository:** `bnob-git/kemper-claims-processing-demo`

## Objective

Update all outdated dependencies in the `kemper-claims-processing-demo` monorepo to their latest stable compatible versions. The goal is to address security vulnerabilities, remove deprecation warnings, and keep the stack current -- without introducing breaking changes to existing functionality.

## Repository Structure

This is a monorepo with two independently buildable applications:

```
kemper-claims-processing-demo/
├── backend/          # Spring Boot 3.x REST API (Java 17, Maven)
│   └── pom.xml       # Backend dependency manifest
├── frontend/         # Angular 17 SPA (Node.js 20, npm)
│   └── package.json  # Frontend dependency manifest
├── Makefile           # Unified task runner
└── .github/workflows/ci.yml  # CI pipeline
```

## Current Versions and Target Upgrades

### Backend (`backend/pom.xml`)

| Dependency | Current Version | Target Version | Notes |
|---|---|---|---|
| Spring Boot (parent POM) | `3.2.5` | Latest stable `3.4.x` | Upgrade parent POM `spring-boot-starter-parent`. All `spring-boot-starter-*` deps inherit the version from the parent, so they do NOT need individual version bumps. |
| springdoc-openapi (`springdoc-openapi-starter-webmvc-ui`) | `2.5.0` (set via `${springdoc.version}` property) | Latest stable `2.x` | Update the `<springdoc.version>` property in `<properties>`. |
| H2 Database (`com.h2database:h2`) | Managed by Spring Boot parent | No action needed | Version is inherited from the Spring Boot BOM -- it will auto-upgrade with the parent POM bump. |
| Maven Checkstyle Plugin | `3.3.1` (set via `${checkstyle.version}` property) | Latest stable `3.x` | Update the `<checkstyle.version>` property in `<properties>`. Verify `backend/checkstyle.xml` still works with the new plugin version. |

### Frontend (`frontend/package.json`)

**Production dependencies:**

| Dependency | Current Version | Target Version | Notes |
|---|---|---|---|
| `rxjs` | `7.8.1` | Latest `7.x` | Patch/minor update; should be backwards compatible. |
| `tslib` | `2.6.3` | Latest `2.x` | Patch/minor update; should be backwards compatible. |
| `zone.js` | `0.14.10` | Latest `0.14.x` or `0.15.x` | Must remain compatible with the current Angular 17.3.x version. Check Angular's `peerDependencies` before upgrading. Do NOT upgrade to a version that requires Angular 18+. |

**Dev dependencies:**

| Dependency | Current Version | Target Version | Notes |
|---|---|---|---|
| `@playwright/test` | `1.44.1` | Latest stable | E2E test framework; major version bumps are generally safe. |
| `@types/jasmine` | `5.1.4` | Latest `5.x` | Type definitions only. |
| `jasmine-core` | `5.1.2` | Latest `5.x` | Test framework core. |
| `karma` | `6.4.3` | Latest `6.x` | Test runner. Do NOT upgrade to Karma 7 if it exists -- stay on `6.x` for Angular 17 compatibility. |
| `karma-chrome-launcher` | `3.2.0` | Latest `3.x` | |
| `karma-coverage` | `2.2.1` | Latest `2.x` | |
| `karma-jasmine` | `5.1.0` | Latest `5.x` | |
| `karma-jasmine-html-reporter` | `2.1.0` | Latest `2.x` | |
| `eslint` | `8.57.0` | Stay on `8.x` (see below) | **Do NOT upgrade to ESLint 9.** |
| `@typescript-eslint/eslint-plugin` | `7.11.0` | Latest `7.x` | Must stay on `7.x` to remain compatible with ESLint 8. |
| `@typescript-eslint/parser` | `7.11.0` | Latest `7.x` | Must stay on `7.x` to remain compatible with ESLint 8. |

**Do NOT modify these (Angular framework packages):**

The following Angular packages are at `17.3.x` and are managed by the separate `UPGRADE-001` ticket. Do NOT change their versions in this ticket:
- `@angular/animations`, `@angular/cdk`, `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/material`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`, `@angular/router`
- `@angular-devkit/build-angular`, `@angular/cli`, `@angular/compiler-cli`
- `@angular-eslint/builder`, `@angular-eslint/eslint-plugin`, `@angular-eslint/eslint-plugin-template`, `@angular-eslint/schematics`, `@angular-eslint/template-parser`
- `typescript` (pinned to `5.4.5` for Angular 17 compatibility)

## ESLint 9 Decision: Do NOT Upgrade

ESLint 9 uses a fundamentally different "flat config" format (`eslint.config.js`) instead of the current `.eslintrc.json`. As of Angular 17, `@angular-eslint` does not support ESLint 9's flat config. Upgrading would require:
- Rewriting `.eslintrc.json` to `eslint.config.js`
- Upgrading all `@angular-eslint/*` packages (which is out of scope -- see UPGRADE-001)
- Upgrading `@typescript-eslint/*` to v8+ (which drops ESLint 8 support)

**Action:** Keep ESLint at `8.x`. Only bump patch/minor within `8.57.x`. This will be revisited after the Angular upgrade in UPGRADE-001.

## Step-by-Step Execution Plan

### Phase 1: Backend Dependency Updates

1. Open `backend/pom.xml`
2. Update the `<version>` in the `<parent>` block from `3.2.5` to the target Spring Boot `3.4.x` version
3. Update `<springdoc.version>` in `<properties>` to the target version
4. Update `<checkstyle.version>` in `<properties>` to the target version
5. Verify backend compiles and tests pass:
   ```bash
   cd backend && ./mvnw clean verify -B
   ```
6. Verify Checkstyle still works:
   ```bash
   cd backend && ./mvnw checkstyle:check -B
   ```
7. If any tests fail, check the Spring Boot 3.3.x and 3.4.x migration guides for breaking changes and fix accordingly

### Phase 2: Frontend Dependency Updates

1. Open `frontend/package.json`
2. Update the version numbers for the dependencies listed in the "Frontend" table above. Do NOT touch Angular framework packages or TypeScript.
3. Delete `frontend/node_modules/` and `frontend/package-lock.json`, then reinstall:
   ```bash
   cd frontend && rm -rf node_modules package-lock.json && npm install
   ```
4. Verify frontend linting passes:
   ```bash
   cd frontend && npm run lint
   ```
5. Verify frontend tests pass:
   ```bash
   cd frontend && npm test
   ```
6. Verify production build succeeds:
   ```bash
   cd frontend && npm run build
   ```

### Phase 3: Final Validation

1. Run the full CI-equivalent checks from the repo root:
   ```bash
   cd backend && ./mvnw clean verify -B
   cd frontend && npm run lint && npm test && npm run build
   ```
2. Ensure the CI pipeline (`.github/workflows/ci.yml`) will pass -- this pipeline runs:
   - Backend: `mvn clean verify -B` (hard gate), `mvn checkstyle:check -B` (soft gate, `continue-on-error: true`)
   - Frontend: `npm ci`, `npm run lint` (soft gate), `npm test` (hard gate), `npm run build` (hard gate)

## Acceptance Criteria

- [ ] `backend/pom.xml`: Spring Boot parent version updated to latest stable `3.4.x`
- [ ] `backend/pom.xml`: `springdoc.version` property updated to latest stable `2.x`
- [ ] `backend/pom.xml`: `checkstyle.version` property updated to latest stable `3.x`
- [ ] `frontend/package.json`: `rxjs`, `tslib`, `zone.js` updated to latest compatible versions
- [ ] `frontend/package.json`: `karma`, `karma-*`, `jasmine-core`, `@types/jasmine` updated to latest compatible versions within their current major version
- [ ] `frontend/package.json`: `@playwright/test` updated to latest stable
- [ ] `frontend/package.json`: `@typescript-eslint/*` updated to latest `7.x`
- [ ] `frontend/package.json`: ESLint remains on `8.x` (NOT upgraded to 9)
- [ ] `frontend/package.json`: Angular framework packages and TypeScript are NOT modified
- [ ] `cd backend && ./mvnw clean verify -B` passes (all backend tests green)
- [ ] `cd backend && ./mvnw checkstyle:check -B` runs without errors
- [ ] `cd frontend && npm run lint` passes with no new errors
- [ ] `cd frontend && npm test` passes (all frontend unit tests green)
- [ ] `cd frontend && npm run build` succeeds (production build)
- [ ] GitHub Actions CI pipeline passes on the PR
- [ ] PR description documents the before/after version changes

## Constraints

- **Java version**: Must remain Java 17 (`<java.version>17</java.version>` in `pom.xml`). Do not change this.
- **Node.js version**: CI uses Node.js 20. Do not introduce dependencies that require Node.js 22+.
- **Angular version**: Do not modify any `@angular/*` packages. Those are handled by UPGRADE-001.
- **TypeScript version**: Do not modify `typescript` -- it is pinned for Angular 17 compatibility.
- **Test exclusions**: The backend's `maven-surefire-plugin` excludes tests tagged with the `known-defect` group. Do not change this configuration.
- **No config file format changes**: Do not convert `.eslintrc.json` to flat config. Do not modify `checkstyle.xml`, `karma.conf.js`, `angular.json`, or `tsconfig.json` unless a dependency upgrade strictly requires it (and document why).

## Useful Context

- The backend uses an in-memory H2 database seeded by `data.sql`. There is no persistent database to migrate.
- The frontend uses Angular Material with the `indigo-pink` prebuilt theme (referenced in `angular.json`).
- Checkstyle config is at `backend/checkstyle.xml` and enforces `MethodLength` (max 40), `CyclomaticComplexity` (max 8), `UnusedImports`, and naming conventions.
- The `Makefile` at the repo root provides convenience targets: `make test`, `make lint`, `make build`.
- Tests tagged `known-defect` in the backend are intentionally excluded from the test suite (seeded bugs for demo purposes). These should remain excluded.

## Demo Relevance
This ticket tests the agent's ability to perform routine dependency maintenance across a polyglot monorepo, a common real-world task.
