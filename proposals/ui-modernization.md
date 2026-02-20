# PNC Claims Portal — UI Modernization Proposal

**Date:** February 2026
**Author:** Devin (requested by @bnob-git)
**Scope:** Frontend analysis and improvement roadmap — no code changes

---

## 1. Executive Summary

The PNC Claims Portal is an Angular 17 standalone-component application using Angular Material (v17.3) with the prebuilt `indigo-pink` theme. It covers a complete claims lifecycle: Dashboard, FNOL intake, Claim Detail, Triage/Assignment, and Settlement/Close. While functionally complete, the UI has significant gaps in responsiveness, accessibility, visual consistency, component reuse, and error handling that would benefit from a structured modernization effort.

---

## 2. Current Tech Stack

| Layer | Detail |
|---|---|
| Framework | Angular 17.3.12 (standalone components, no NgModules) |
| UI Library | Angular Material 17.3.10 + Angular CDK 17.3.10 |
| Theme | Prebuilt `indigo-pink.css` (no custom theme) |
| CSS Approach | Inline component styles + one global `styles.css` (32 lines) |
| Forms | Mix of Reactive Forms (`FnolFormComponent`, `ClaimDetailComponent`) and template-driven (`FormsModule` in Triage, Settlement) |
| Routing | Flat route config, 5 routes, no lazy loading |
| State Management | None — each component fetches its own data via `ClaimsService` |
| Testing | Karma/Jasmine unit tests (only Dashboard has a spec file), Playwright e2e |
| Build | `@angular-devkit/build-angular:application` builder |

---

## 3. Current UI Assessment

### 3.1 Visual Design

**Findings:**

- **No custom theme.** The app uses Angular Material's prebuilt `indigo-pink.css` with zero customization. There are no CSS custom properties, no design tokens, and no brand colors defined.
- **Hardcoded inline styles everywhere.** Every component template relies heavily on inline `style="..."` attributes (e.g., `style="display: flex; align-items: center; gap: 16px;"` repeated across Dashboard, ClaimDetail, Triage, Settlement). This makes visual consistency fragile and updates expensive.
- **Status chips are hand-rolled.** The `.status-chip` class and its six color variants (`.status-OPEN`, `.status-UNDER_INVESTIGATION`, etc.) are defined in global `styles.css` with hardcoded hex colors rather than using Angular Material's chip or badge components.
- **No typography scale.** Headings are plain `<h2>` tags; there is no consistent use of Material typography classes (`mat-headline`, `mat-body`, etc.).
- **No iconography system beyond Material Icons.** Icons are loaded via Google Fonts CDN with no fallback or icon sprite.

**Gaps:**
- No brand identity (logo, color palette, spacing scale)
- No dark mode support
- No consistent elevation/shadow usage

### 3.2 Responsiveness

**Findings:**

- **No responsive breakpoints anywhere.** The entire application uses fixed `max-width: 1200px` container with no media queries in any component or global style.
- **Grid layouts will break on mobile.** The FNOL form uses `grid-template-columns: 1fr 1fr`, the Claim Detail info cards use `grid-template-columns: 1fr 1fr`, and the Triage page uses `grid-template-columns: 1fr 1fr` — all without responsive fallback.
- **Tables are not responsive.** The Dashboard `mat-table` with 7 columns and the various tab tables in Claim Detail will overflow horizontally on small screens.
- **Toolbar navigation lacks mobile handling.** The `mat-toolbar` shows all nav buttons inline with no hamburger menu or mobile drawer pattern.
- **The viewport meta tag is present** (`<meta name="viewport" content="width=device-width, initial-scale=1">`) in `index.html`, but no CSS leverages it.

**Gaps:**
- Zero mobile/tablet support
- No Angular CDK `BreakpointObserver` usage
- No `@media` queries anywhere in the project

### 3.3 User Experience Flows

**Findings:**

- **No loading states.** All five components call `ClaimsService` methods in `ngOnInit` and render immediately — there are no spinners, skeletons, or `*ngIf="loading"` guards. If the API is slow, users see empty tables/cards with no feedback.
- **No global error handling.** HTTP errors are caught only in `FnolFormComponent.onSubmit()` (via `MatSnackBar`). The Dashboard, ClaimDetail, Triage, and Settlement components have zero error handling on their API calls — a failed request silently renders nothing.
- **No empty state designs.** When tables are empty (e.g., no assignments, no documents, no payments), the app shows a plain `<p>No assignments yet.</p>` with no illustration or call-to-action.
- **Navigation is minimal.** There are only two toolbar buttons (Dashboard, New Claim) and a disabled user menu. There is no breadcrumb trail, no sidebar, and no indication of the current active route.
- **Form validation UX is incomplete.** The FNOL form has `<mat-error>` elements for required fields, but there is an intentional validation bypass bug (line 140 of `fnol-form.component.ts`) where `lossType === 'OTHER'` skips validation entirely. Additionally, phone number validation is `Validators.required` only — no format validation.
- **No confirmation dialogs.** Destructive actions like "Deny Reserve" and "Close Claim" execute immediately on click with no confirmation prompt.
- **Date formatting is raw.** Dates are rendered as raw strings (`{{claim.lossDate}}`, `{{event.createdAt}}`) with no `DatePipe` formatting.
- **Currency formatting is manual.** Dollar amounts use string concatenation (`'$' + claim.reserveAmount`) instead of Angular's `CurrencyPipe`.

**Gaps:**
- No loading indicators anywhere
- No error boundaries or retry mechanisms
- No confirmation for destructive actions
- No route-level active state highlighting
- Raw date/currency display

### 3.4 Accessibility (a11y)

**Findings:**

- **No ARIA attributes.** Zero `aria-label`, `aria-describedby`, `aria-live`, or `role` attributes across all templates.
- **No skip-to-content link.** The page has no mechanism for keyboard users to skip past the toolbar to main content.
- **Status chips lack semantic meaning.** The colored `.status-chip` spans convey meaning through color alone with no text alternative for screen readers.
- **Table rows are not keyboard-navigable.** The Dashboard table rows have `cursor: pointer` style but no `tabindex`, `role="link"`, or keyboard event handlers — the row click is purely visual suggestion with no actual row-click handler.
- **No focus management on route changes.** Angular's router does not automatically manage focus; after navigation, screen reader users have no indication of context change.
- **Form errors are visual-only.** While `<mat-error>` elements exist, there are no `aria-invalid` or `aria-errormessage` associations to connect inputs with their error text.
- **Color contrast may be insufficient.** Several status chip colors (e.g., `.status-UNDER_INVESTIGATION` with `#e65100` on `#fff3e0`) have not been verified against WCAG 2.1 AA contrast requirements (4.5:1 for normal text).
- **No `<main>` landmark.** The content area is a plain `<div class="container">` rather than a `<main>` element.

**Gaps:**
- Fails WCAG 2.1 Level AA on multiple criteria
- No screen reader support beyond what Angular Material provides by default
- No keyboard navigation for interactive elements

### 3.5 Component Architecture

**Findings:**

- **All templates are inline.** Every component uses `template: \`...\`` and `styles: [\`...\`]` rather than external `.html` and `.css` files. The `ClaimDetailComponent` template alone is ~170 lines of inline HTML — this hurts readability and maintainability.
- **No shared/reusable components.** The status chip pattern (`.status-chip` with `[ngClass]`) is duplicated in Dashboard, ClaimDetail, Triage, and Settlement templates. The back-button + title + status header pattern is repeated in ClaimDetail, Triage, and Settlement.
- **Inconsistent forms approach.** `FnolFormComponent` and `ClaimDetailComponent` (document form) use Reactive Forms, while `TriageComponent` and `SettlementComponent` use template-driven forms with `[(ngModel)]`. This inconsistency makes maintenance harder.
- **No separation of concerns in data loading.** Each component directly subscribes to `ClaimsService` observables without any resolver, guard, or state management. Multiple parallel subscriptions in `ClaimDetailComponent.loadClaim()` (5 concurrent HTTP calls) have no coordination or error handling.
- **No shared layout components.** There is no page-layout wrapper, no section-header component, no info-row/field-value component — each page manually constructs its own layout.
- **Only one component has unit tests.** Only `DashboardComponent` has a spec file. The other four components (FNOL, ClaimDetail, Triage, Settlement) have zero test coverage.
- **No lazy loading.** All five route components are eagerly imported in `app.routes.ts`. For an app of this size it's acceptable, but not scalable.

**Gaps:**
- Significant code duplication across components
- No reusable UI building blocks
- Mixed forms strategy
- Missing test coverage for 4 of 5 components

---

## 4. Existing Design System / Shared Library

**Finding: None exists.**

There is no design system, style guide, shared component library, Storybook configuration, or design token file in the project. The only shared styling is the 32-line global `styles.css` containing the container class, spacer utility, and status chip definitions.

---

## 5. Prioritized Improvement Recommendations

### Priority 1 — Critical (High Impact, Foundational)

#### 5.1 Create a Custom Angular Material Theme
**What:** Replace the prebuilt `indigo-pink.css` with a custom SCSS theme using `@angular/material`'s theming API. Define a primary, accent, and warn palette aligned with PNC/Kemper branding. Introduce CSS custom properties for spacing, border-radius, and elevation.

**Why:** Every visual improvement downstream depends on having a proper theme foundation.

**Effort:** Medium

---

#### 5.2 Extract Shared Components
**What:** Create reusable components for:
- `StatusChipComponent` — replaces the duplicated `.status-chip` + `[ngClass]` pattern
- `PageHeaderComponent` — back button + title + status chip + action buttons (used in ClaimDetail, Triage, Settlement)
- `InfoFieldComponent` — label/value pair display (used extensively in ClaimDetail info grids)
- `EmptyStateComponent` — illustration + message + optional CTA for empty tables/lists

**Why:** Eliminates code duplication across 4+ components and establishes a pattern library for future development.

**Effort:** Medium

---

#### 5.3 Add Loading States & Error Handling
**What:**
- Add a loading spinner or skeleton screen for each API-driven view (Dashboard table, ClaimDetail tabs, Triage/Settlement cards).
- Implement a global HTTP error interceptor that catches 4xx/5xx responses and shows user-friendly error messages.
- Add retry logic or "Try Again" actions for failed requests.

**Why:** Currently, network failures are completely silent and users see blank pages with no feedback.

**Effort:** Medium

---

### Priority 2 — High (User-Facing Quality)

#### 5.4 Make the UI Responsive
**What:**
- Add responsive breakpoints (mobile < 768px, tablet < 1024px) to all grid layouts.
- Convert the 2-column grids in FNOL, ClaimDetail, Triage, and Settlement to stack vertically on small screens.
- Use Angular CDK's `BreakpointObserver` or CSS `@media` queries.
- Replace or wrap the Dashboard `mat-table` with a responsive card layout on mobile.
- Add a mobile sidebar/drawer navigation using `MatSidenavModule` for the toolbar.

**Why:** The portal is completely unusable on mobile/tablet devices.

**Effort:** Large

---

#### 5.5 Improve Accessibility (WCAG 2.1 AA)
**What:**
- Add a skip-to-content link.
- Replace the content `<div class="container">` with `<main>` landmark.
- Add `aria-label` attributes to all icon-only buttons (back buttons, toolbar icons).
- Add `aria-live="polite"` regions for dynamic content updates (snackbar messages, status changes).
- Ensure all form fields have proper `aria-invalid` and `aria-errormessage` bindings.
- Verify and fix color contrast ratios for all status chip variants.
- Add keyboard navigation support for the Dashboard table (row click via Enter/Space).
- Implement focus management on route transitions (e.g., move focus to `<h2>` on page load).

**Why:** The app currently fails basic WCAG 2.1 AA compliance — a legal and usability requirement for enterprise software.

**Effort:** Medium

---

#### 5.6 Standardize Forms on Reactive Forms
**What:**
- Convert Triage and Settlement from template-driven forms (`[(ngModel)]`) to Reactive Forms.
- Add proper validation for all inputs (e.g., phone number format, reserve amount > 0, payment amount <= reserve).
- Add confirmation dialogs (using `MatDialog`) for destructive actions: "Deny Reserve" and "Close Claim."

**Why:** Consistent forms approach simplifies testing, validation, and maintenance. Confirmation dialogs prevent accidental destructive actions.

**Effort:** Medium

---

### Priority 3 — Medium (Polish & Maintainability)

#### 5.7 Move Templates & Styles to External Files
**What:** Extract all inline `template` and `styles` properties to separate `.html` and `.css` (or `.scss`) files. The `ClaimDetailComponent` alone has ~170 lines of inline HTML that should be in its own file.

**Why:** Improves readability, enables IDE template linting, and aligns with Angular style guide recommendations for templates > 3 lines.

**Effort:** Small

---

#### 5.8 Use Angular Pipes for Data Formatting
**What:**
- Replace all raw date string interpolation (`{{claim.lossDate}}`) with `DatePipe` (`{{claim.lossDate | date:'mediumDate'}}`).
- Replace manual currency concatenation (`'$' + claim.reserveAmount`) with `CurrencyPipe` (`{{claim.reserveAmount | currency}}`).
- Create a custom `StatusLabelPipe` to format status enum values for display (e.g., `UNDER_INVESTIGATION` -> `Under Investigation`).

**Why:** Proper formatting improves readability, supports i18n, and eliminates string manipulation bugs.

**Effort:** Small

---

#### 5.9 Replace Inline Styles with CSS Classes
**What:** Audit and replace all inline `style="..."` attributes with CSS classes in component stylesheets or a shared utility class system. Common patterns to extract:
- `display: flex; align-items: center; gap: 16px;` (used 5+ times)
- `display: grid; grid-template-columns: 1fr 1fr; gap: 16px;` (used 4 times)
- `margin-bottom: 16px;` / `margin-bottom: 24px;` (used 8+ times)
- `width: 100%;` on tables and form fields (used 10+ times)

**Why:** Inline styles prevent theming, are unsearchable, and contribute to visual inconsistency.

**Effort:** Small

---

#### 5.10 Implement Lazy Loading for Routes
**What:** Convert the eager component imports in `app.routes.ts` to `loadComponent` dynamic imports.

```
{ path: 'fnol', loadComponent: () => import('./components/fnol-form/fnol-form.component').then(m => m.FnolFormComponent) }
```

**Why:** Reduces initial bundle size and improves first-load performance as the app grows.

**Effort:** Small

---

### Priority 4 — Low (Future Scalability)

#### 5.11 Introduce a Design System / Component Library
**What:** Evaluate establishing a shared design system using one of:
- **Storybook** for component documentation and visual regression testing
- A shared library project within the Angular workspace (`ng generate library`)
- Design tokens in JSON/SCSS for colors, spacing, typography, and shadows

This would formalize the shared components from item 5.2 into a documented, testable library.

**Why:** As the portal grows (more claim types, user roles, reporting features), a design system prevents visual drift and speeds up feature development.

**Effort:** Large

---

#### 5.12 Add Comprehensive Unit Test Coverage
**What:** Add spec files for `FnolFormComponent`, `ClaimDetailComponent`, `TriageComponent`, and `SettlementComponent`. Target coverage for:
- Component creation and initialization
- Form validation behavior
- API interaction mocking
- UI state transitions (loading, error, empty)

**Why:** Only 1 of 5 components has tests. UI modernization changes will be safer with a test safety net.

**Effort:** Large

---

#### 5.13 Introduce State Management
**What:** Evaluate lightweight state management (Angular Signals, NgRx ComponentStore, or a simple BehaviorSubject-based service) to:
- Share claim data between ClaimDetail, Triage, and Settlement without redundant API calls.
- Track loading/error states globally.
- Enable optimistic UI updates.

**Why:** Currently each component independently fetches data, leading to redundant requests and no shared state.

**Effort:** Large

---

## 6. Effort Summary

| # | Improvement | Priority | Effort | Dependencies |
|---|---|---|---|---|
| 5.1 | Custom Material Theme | P1 - Critical | Medium | None |
| 5.2 | Shared Components | P1 - Critical | Medium | None |
| 5.3 | Loading & Error Handling | P1 - Critical | Medium | None |
| 5.4 | Responsive Design | P2 - High | Large | 5.1 (theme), 5.9 (no inline styles) |
| 5.5 | Accessibility (a11y) | P2 - High | Medium | 5.2 (shared components) |
| 5.6 | Standardize Reactive Forms | P2 - High | Medium | None |
| 5.7 | External Templates/Styles | P3 - Medium | Small | None |
| 5.8 | Angular Pipes for Formatting | P3 - Medium | Small | None |
| 5.9 | Replace Inline Styles | P3 - Medium | Small | 5.1 (theme) |
| 5.10 | Lazy Loading Routes | P3 - Medium | Small | None |
| 5.11 | Design System / Storybook | P4 - Low | Large | 5.1, 5.2 |
| 5.12 | Unit Test Coverage | P4 - Low | Large | None |
| 5.13 | State Management | P4 - Low | Large | None |

---

## 7. Recommended Implementation Order

```
Phase 1 (Foundation):     5.1 Theme  ->  5.7 External Files  ->  5.9 Inline Styles
Phase 2 (Components):     5.2 Shared Components  ->  5.8 Pipes  ->  5.10 Lazy Loading
Phase 3 (Quality):        5.3 Loading/Errors  ->  5.5 Accessibility  ->  5.6 Forms
Phase 4 (Responsive):     5.4 Responsive Design
Phase 5 (Scale):          5.11 Design System  ->  5.12 Tests  ->  5.13 State Mgmt
```

Each phase can be delivered as an independent PR or set of PRs. Phases 1-3 should be completed before Phase 4 to avoid rework.

---

## 8. Conclusion

The PNC Claims Portal has a solid functional foundation built on modern Angular 17 patterns (standalone components, typed models, service abstraction). However, it lacks the visual polish, responsiveness, accessibility, and component reuse expected of a production enterprise application. The recommendations above provide a structured path from the current state to a modern, accessible, maintainable UI — starting with foundational theming and shared components, then layering on responsive design and accessibility improvements.
