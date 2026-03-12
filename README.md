# PNC Claims Portal — P&C Auto Claim Processing

A demo-ready prototype for an insurance Property & Casualty (P&C) auto claim processing workflow. Built as a **brownfield-ready** monorepo designed for later modernization/upgrade work by an autonomous agent.

## Tech Stack

| Layer    | Technology                          | Version     |
|----------|-------------------------------------|-------------|
| Frontend | Angular + Angular Material          | 17.3.12     |
| Backend  | Spring Boot + JPA + H2              | 3.2.5       |
| Tests    | JUnit 5, Karma/Jasmine, Playwright  | —           |
| CI       | GitHub Actions                      | —           |

## Prerequisites

- **Java 20+** (JDK)
- **Maven 3.9+**
- **Node.js 20+** and npm
- **Chrome/Chromium** (for Karma tests)

## Quick Start

### Backend
```bash
cd backend
mvn spring-boot:run
```
- API runs at **http://localhost:8080**
- Swagger UI at **http://localhost:8080/swagger-ui.html**
- H2 Console at **http://localhost:8080/h2-console** (JDBC URL: `jdbc:h2:mem:claimsdb`, user: `sa`, no password)

### Frontend
```bash
cd frontend
npm install
npm start
```
- App runs at **http://localhost:4200**

### Docker (optional)
```bash
docker-compose up --build
```
- Frontend: http://localhost:4200
- Backend: http://localhost:8080

## Running Tests

```bash
# Backend unit tests
cd backend && mvn clean test

# Frontend unit tests
cd frontend && npm test

# Frontend E2E (requires both backend and frontend running)
cd frontend && npx playwright test

# Or use the Makefile
make test          # Run all tests
make test-backend  # Backend only
make test-frontend # Frontend only
make e2e           # Playwright E2E
```

## Linting

```bash
# Backend (Checkstyle)
cd backend && mvn checkstyle:check

# Frontend (ESLint)
cd frontend && npm run lint

# Or use the Makefile
make lint
```

## Project Structure

```
pnc-claims/
├── backend/                    # Spring Boot API
│   ├── src/main/java/com/pnc/claims/
│   │   ├── controller/         # REST controllers
│   │   ├── entity/             # JPA entities
│   │   ├── repository/         # Spring Data repositories
│   │   ├── service/            # Business logic
│   │   └── config/             # CORS, etc.
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── data.sql            # Seed data (5 claims, 5 policies, 3 users)
│   ├── src/test/               # JUnit tests
│   ├── checkstyle.xml
│   └── pom.xml
├── frontend/                   # Angular 17 app
│   ├── src/app/
│   │   ├── components/         # Dashboard, FNOL, ClaimDetail, Triage, Settlement
│   │   ├── services/           # ClaimsService (HTTP client)
│   │   └── models/             # TypeScript interfaces
│   ├── e2e/                    # Playwright E2E tests
│   ├── .eslintrc.json
│   ├── angular.json
│   └── package.json
├── tickets/                    # Jira-style work tickets (markdown)
├── .github/workflows/ci.yml   # GitHub Actions CI
├── docker-compose.yml
├── Makefile
└── README.md
```

## Claim Workflow

1. **FNOL** — First Notice of Loss intake (`/fnol`)
2. **Triage & Assignment** — Rule-based or manual adjuster assignment (`/claims/:id/triage`)
3. **Investigation** — Attach documents, add notes (Claim Detail view)
4. **Reserve Decision** — Approve/deny with calculated or manual amount
5. **Settlement & Payment** — Issue payment (`/claims/:id/settlement`)
6. **Closure** — Close with optional subrogation flag

## API Endpoints

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| GET    | `/api/policies`                       | List all policies              |
| GET    | `/api/policies/{id}`                  | Get policy by ID               |
| GET    | `/api/claims`                         | List claims (optional `?status=`) |
| POST   | `/api/claims`                         | Create claim (FNOL)            |
| GET    | `/api/claims/{id}`                    | Get claim details              |
| PATCH  | `/api/claims/{id}/status`             | Update claim status            |
| GET    | `/api/claims/{id}/events`             | Get status history             |
| POST   | `/api/claims/{id}/assignments`        | Auto or manual assign          |
| POST   | `/api/claims/{id}/reserve-decision`   | Approve/deny reserve           |
| POST   | `/api/claims/{id}/documents`          | Add document metadata          |
| POST   | `/api/claims/{id}/payments`           | Issue settlement payment       |
| POST   | `/api/claims/{id}/close`              | Close claim                    |
| GET    | `/api/users`                          | List adjusters                 |

## Intentional Defects (Demo)

This repo contains **seeded defects** designed to be discovered and fixed during a demo:

### 1. UI Bug — FNOL Validation Bypass (BUG-001)
- **Location:** `frontend/src/app/components/fnol-form/fnol-form.component.ts`
- **Issue:** The `onSubmit()` method bypasses form validation when `lossType === 'OTHER'`, allowing claims with missing/invalid fields
- **Reproduce:** Select "Other" loss type, leave fields empty, submit → claim created with severity 0

### 2. Backend Bug — Triage Case Sensitivity (BUG-002)
- **Location:** `backend/src/main/java/com/pnc/claims/service/ClaimService.java`
- **Issue:** Theft triage rule compares `"Theft"` instead of `"THEFT"` (case mismatch)
- **Reproduce:** Run `testTriageAssignment_Theft_ShouldAssignSeniorAdjuster` test — it fails

### 3. Backend Bug — Reserve Rounding (BUG-003)
- **Location:** `backend/src/main/java/com/pnc/claims/service/ClaimService.java`
- **Issue:** Auto-calculation uses `double` arithmetic causing truncation errors
- **Reproduce:** Run `testReserveDecision_AutoCalculation_RoundingBug_Severity3` test — it fails

### 4. Lint Issues (LINT-001)
- **Frontend:** `console.log` calls and unused `debugMode` variable in FnolFormComponent
- **Backend:** Unused `lastProcessedClaimId` field in ClaimService
- **Reproduce:** Run `npm run lint` and `mvn checkstyle:check`

## Tickets

See the `/tickets` folder for 7 Jira-style work tickets:
- **BUG-001:** FNOL validation bypass
- **BUG-002:** Triage theft case mismatch
- **BUG-003:** Reserve calculation rounding
- **ENHANCE-001:** Claim search and filtering
- **ENHANCE-002:** Email notification stubs
- **UPGRADE-001:** Angular 17 → 19 upgrade
- **UPGRADE-002:** Dependency updates
- **TEST-001:** Expand regression test suite
- **LINT-001:** Fix static analysis issues

## Seed Data

The H2 database is populated on startup with:
- **5 policies** (Honda Civic, Toyota Corolla, Tesla Model S, BMW 328i, Ford Focus)
- **5 claims** in various statuses (OPEN, UNDER_INVESTIGATION, RESERVE_SET, SETTLED, CLOSED)
- **3 adjusters** (2 Senior Adjusters, 1 Adjuster)
- Assignments, documents, payments, and status history events
