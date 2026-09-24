# HomeFix — E2E Test Suite Infrastructure & Documentation

## Overview

The HomeFix E2E Test Suite provides complete, opaque-box, deterministic verification of the **HomeFix: Matriz de Arreglos del Hogar** Single Page Application. It validates all functional requirements (R1–R5), interface contracts, algorithm edge cases, responsive layout boundaries, and full lifecycle user scenarios.

The test infrastructure is designed with a **Dual-Mode Execution Architecture**:
1. **Autonomous Standalone Runner (`node tests/e2e/runner.ts`)**: Zero external dependencies, runs directly on Node.js (v24+ native ESM TypeScript type-stripping), executes in ~0.04 seconds with colored terminal reporting, tier breakdowns, and strict exit code semantics (0 on pass, 1 on failure).
2. **Vitest Test Runner (`npm test` / `npx vitest run`)**: Full compatibility with the project's Vitest runner, integrating seamlessly into standard developer workflows and CI/CD pipelines.

---

## 4-Tier Test Suite Architecture

| Tier | Name | Focus | Suite File | Test Cases | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Tier 1** | **Feature Coverage** | Dedicated validation of features F1 through F13 (>=5 test cases per feature) | `tests/e2e/tier1_features.test.ts` | 65 | **PASS** |
| **Tier 2** | **Boundary & Corner Cases** | Edge coordinates, input limits, validation rejects, boundary thresholds, payload stress | `tests/e2e/tier2_boundaries.test.ts` | 30 | **PASS** |
| **Tier 3** | **Cross-Feature Combinations** | Systematic pairwise/orthogonal coverage, full 25-cell truth table, status penalties, multi-filter matrix | `tests/e2e/tier3_combinations.test.ts` | 38 | **PASS** |
| **Tier 4** | **Real-World Scenarios** | End-to-end multi-step household repair lifecycles from creation to triage, matrix grouping, and completion | `tests/e2e/tier4_real_world.test.ts` | 6 | **PASS** |
| **Total** | | **Comprehensive E2E Coverage** | **All 4 Tiers** | **139** | **100% PASS** |

---

## Test Directory Structure

```
tests/e2e/
├── harness.ts                  # Autonomous test runner engine, BDD assertions (expect), Vitest bridge, timing & ANSI reporter
├── contracts.ts                # Authoritative domain types, validation rules, reference prioritization oracles, storage simulators
├── tier1_features.test.ts      # Tier 1: 65 feature tests (F1–F13)
├── tier2_boundaries.test.ts    # Tier 2: 30 boundary & corner tests (B1–B6)
├── tier3_combinations.test.ts  # Tier 3: 38 combinatorial & truth table tests (C1–C4)
├── tier4_real_world.test.ts    # Tier 4: 6 end-to-end multi-step user scenarios (S1–S6)
└── runner.ts                   # Master CLI runner orchestrating all tiers
```

---

## Detailed Tier Breakdown

### Tier 1: Feature Coverage (65 Test Cases)
- **F1: Declarative Scaffolding & Tooling** (5 tests): `package.json` scripts, dependencies (React 19, Tailwind, Supabase, Lucide), `vite.config.ts`, `tsconfig.json`, `index.html` structure.
- **F2: Git & Vercel Setup** (5 tests): `.gitignore` exclusions, `vercel.json` SPA rewrites & security headers, `.env.example`, ESM `type: module`.
- **F3: HomeFix Data Model & Types** (5 tests): Mandatory fields (`id`, `title`, `room`, `urgency`, `effort`, `execution_type`, `status`), RoomId enum validation, ExecutionType validation, TaskStatus validation, title length constraints [3, 120].
- **F4: Prioritization Engine & Continuous Ranking Score** (5 tests): Critical Urgency (4-5) high effort -> P1; Urgency >= 4 low effort -> P2 Quick Win; Moderate/Low Urgency high effort -> P3; Low urgency/effort -> P4; Continuous ranking score normalization [0.00, 100.00] and hierarchy.
- **F5: Representative Seed Data** (5 tests): Seed Task 1 Kitchen pipe leak (Q2/P2 DIY), Seed Task 2 Living roof leak (Q1/P1 Pro), Seed Task 3 Bedroom doorknob (Q4/P4 DIY), UUID v4 compliance, ISO timestamp formatting.
- **F6: Supabase Client & Resilient Offline Fallback** (5 tests): Local cache hydration, optimistic offline creations, pending mutation queue enqueueing, reconnection queue draining, graceful handling of PGRST205/network offline.
- **F7: Supabase Schema DDL** (5 tests): Table `public.homefix_tasks`, UUID primary key, check constraints (urgency 1..5, effort 1..5, cost >= 0), multi-column indexes, `updated_at` trigger, RLS policies.
- **F8: Header & View Switcher** (5 tests): Brand title/subtitle, Tablero vs Lista toggle, global stats summary (total, pending, done), budget calculation, connectivity status indicator.
- **F9: Task Creation & Edit Modal** (5 tests): 7 form fields, segmented 1-5 selectors with defaults, live dynamic priority preview, validation error feedback, clean reset upon submit.
- **F10: 2x2 Matrix View & Quadrant Partition** (5 tests): Q1 Emergencias (Urg>=4, Eff>=3), Q2 Quick Wins (Urg>=3, Eff<=2), Q3 Proyectos (Eff>=3, Urg<=3 or Cost>=50k), Q4 Postergables (Urg<=2, Eff<=2), 4 disjoint buckets partition.
- **F11: List View, Dynamic Multi-Filters & Sorting** (5 tests): Priority score descending sort, Room filter ('cocina', 'baño', etc.), ExecutionType filter ('diy' vs 'profesional'), Status filter ('pendiente', 'en_proceso', 'listo'), case-insensitive title search.
- **F12: Task Card Formatting & Quick Done Toggle** (5 tests): Room badge & icon, DIY/Pro badge, Argentine Pesos currency formatting (`$ 15.000`), 1-tap quick status toggle, 80% score penalty on completion.
- **F13: Mobile-First Responsive Design & WCAG AA** (5 tests): Mobile viewport (360px) tabbed layout, desktop grid (>=768px), minimum 44px touch targets, >=4.5:1 text contrast, zero horizontal scroll contract.

### Tier 2: Boundary & Corner Cases (30 Test Cases)
- **B1: Urgency Boundaries** (5 tests): Lower bound Urg=1, upper bound Urg=5, invalid Urg=0 rejected, invalid Urg=6 rejected, non-integer Urg=3.5 rejected.
- **B2: Effort Boundaries** (5 tests): Lower bound Eff=1, upper bound Eff=5, invalid Eff=0 rejected, invalid Eff=6 rejected, non-integer Eff=2.8 rejected.
- **B3: Cost Boundaries** (5 tests): Zero cost ($0) accepted, null/undefined accepted, negative cost (-$50) rejected, $50,000 threshold promotion to P3/Q3, upper limit $99,999,999 with clamped bonus points.
- **B4: Title Length Boundaries** (5 tests): Exact min length 3 accepted ("Gas"), length 2 rejected ("No"), exact max 120 accepted, length 121 rejected, whitespace-only trimmed & rejected.
- **B5: Edge Coordinates & Partitions** (5 tests): Coordinate partition (Urg=3, Eff=3) -> Q3; Acceptance criteria boundary (Urg=4, Eff=2) -> Q2/P2; Extreme Quick Win (Urg=5, Eff=1); Extreme Planned Project (Urg=1, Eff=5); Low urgency partition (Urg=2, Eff=2) -> Q4/P4.
- **B6: Storage & Payload Boundaries** (5 tests): Corrupted JSON in cache recovery, special characters/emojis/accents in title, update non-existent ID rejection, missing required fields rejection, mutation queue FIFO preservation.

### Tier 3: Cross-Feature Combinations (38 Test Cases)
- **C1: Full 25-Cell Urgency x Effort Truth Table** (25 tests): Complete verification of every cell in the 5x5 matrix against exact expected priority (P1..P4), quadrant (Q1..Q4), and score ($S \in [25.20, 92.40]$).
- **C2: ExecutionType x Effort Cross Combinations** (4 tests): DIY low effort (immediate action), DIY high effort (weekend renovation), Pro high effort (contractor emergency), Pro low effort (specialist inspection).
- **C3: Status Modifier Effects Across All Priority Tiers** (5 tests): P1 completed score drop (92.40 -> 18.48), P2 completed score drop (74.00 -> 14.80), P3 completed score drop (48.40 -> 9.68), P4 completed score drop (28.00 -> 5.60), 'en_proceso' full score retention.
- **C4: Multi-Filter Combinatorial Matrix** (4 tests): Triple filter intersection (Room + Exec + Status), non-matching filter empty set, partial filter single dimension, status filter + title substring search.

### Tier 4: Real-World Application Scenarios (6 Test Cases)
- **Scenario 1**: Emergency Kitchen Pipe Burst (Pérdida en bacha) — Urgent DIY leak discovery -> Q2/P2 classification -> 20-min fix -> 1-tap "Listo" status toggle -> 80% score penalty -> list view filter exclusion.
- **Scenario 2**: Severe Storm Damage & Ceiling Infiltration — Urgent structural living room leak -> Q1/P1 classification -> ranks #1 in List View (score 90.80) -> contractor contacted & updated to "en_proceso" -> budget updated by $120,000.
- **Scenario 3**: Bathroom & Bedroom Spring Renovation — High-budget ($65,000) painting promoted to P3/Q3 -> grouped into Q3 on Matrix Board -> substring search for "esmalte" isolates task -> cost edit persistence.
- **Scenario 4**: Weekend Preventive Maintenance Sprint — 3 minor home repairs recorded into Q4 -> batch resolution of 2 items -> active Q4 count decreases -> done count updates reactively.
- **Scenario 5**: Offline Disaster Triage with Network Interruption & Recovery — Home power/internet loss -> app operates seamlessly on local cache -> offline creation and status toggle enqueued -> reconnection triggers queue drain -> 100% remote consistency.
- **Scenario 6**: Multi-Filter Edge Navigation & Reset Under Mobile Viewport — 360px mobile viewport -> restrictive filtering yields 0 results -> user clicks "Limpiar todos los filtros" -> catalog instantly restored.

---

## How to Run the Tests

### 1. Standalone Autonomous Runner (Recommended)
Fastest, zero setup, outputs formatted report:
```bash
node tests/e2e/runner.ts
```

### 2. Vitest Test Runner
Runs all suites using the project test framework:
```bash
npm test
# or
npx vitest run
```

### 3. Individual Test Suites
```bash
npx vitest run tests/e2e/tier1_features.test.ts
npx vitest run tests/e2e/tier2_boundaries.test.ts
npx vitest run tests/e2e/tier3_combinations.test.ts
npx vitest run tests/e2e/tier4_real_world.test.ts
```

---

## Authoritative Output Sources

All test expectations and assertions were derived strictly from:
1. `ORIGINAL_REQUEST.md`: Core requirements R1 to R5 and Acceptance Criteria.
2. `PROJECT.md`: System architecture, interface contracts (`Task`, `ComputedTask`, `StorageService`), and feature inventory F1–F15.
3. `survey_report.md`: Data model specifications, 25-cell truth table, mathematical continuous scoring formula, Supabase DDL, and resilient offline sync architecture.
4. `spec_report.md`: UI/UX design tokens, 2x2 matrix coordinates, mobile tabbed layout specifications, and WCAG 2.1 AA accessibility criteria.
