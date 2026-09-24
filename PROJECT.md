# Project: HomeFix — Matriz de Arreglos del Hogar

## Architecture
HomeFix is an interactive Single Page Application (SPA) designed to catalog, evaluate, and visually prioritize domestic repairs through an impact/urgency vs. effort matrix.

### Tech Stack
- **Framework & Build**: React 19 + TypeScript 5 + Vite 6
- **Styling**: Tailwind CSS with responsive mobile-first tokens
- **Iconography**: Lucide React
- **Data & State Management**: Offline-first reactive store with optimistic UI updates
- **Backend / Persistence**: Supabase JS client (`homefix_tasks` table) with resilient, automatic fallback to `localStorage` and pending mutation queue
- **Testing**: Vitest + React Testing Library (unit/integration) and custom automated E2E test harness
- **Deployment & Versioning**: Git repository initialized with strict `.gitignore` and `vercel.json` SPA configuration

```
┌─────────────────────────────────────────────────────────────┐
│                       React SPA UI                         │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Navbar & Controls   │       │   Task Modal / Form   │  │
│  │   (View Toggle, Add)  │       │  (Segmented Sliders)  │  │
│  └───────────────────────┘       └───────────────────────┘  │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │ 2x2 Matrix View       │       │ List / Table View     │  │
│  │ (Desktop Grid/Mobile) │       │ (Multi-Filter & Sort) │  │
│  └───────────────────────┘       └───────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────▼───────────────┐
               │    Prioritization Engine      │
               │  (P1..P4 Logic & Rank Score)  │
               └───────────────┬───────────────┘
                               │
               ┌───────────────▼───────────────┐
               │  Resilient Storage Service    │
               │  (Sync Coordinator)           │
               └───────┬───────────────┬───────┘
                       │               │
        ┌──────────────▼──────┐ ┌──────▼──────────────┐
        │ Supabase Client     │ │ LocalStorage Cache  │
        │ (homefix_tasks)     │ │ & Mutation Queue    │
        └─────────────────────┘ └─────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Declarative Scaffolding | React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, clean build pipeline | M1 | survey_1 |
| F2 | Git & Vercel Setup | Git repository init, production `.gitignore`, `vercel.json` with SPA rewrites | M1 | survey_1 |
| F3 | HomeFix Data Model | TypeScript types (`Task`, `RoomId`, `ExecutionType`, `TaskStatus`, `ComputedTask`) & validation rules | M2 | survey_2 |
| F4 | Prioritization Algorithm | Categorical classification (P1 Emergencia, P2 Quick Win, P3 Proyecto, P4 Postergable) + continuous ranking score (0-100) | M2 | survey_2 |
| F5 | Representative Seed Data | 3 representative domestic repair tasks preloaded for initial launch | M2 | survey_2 |
| F6 | Supabase Client & Offline Sync | Primary Supabase client + resilient `localStorage` cache and optimistic mutation queue | M2 | survey_2 |
| F7 | Supabase Schema DDL | Documented `supabase_schema.sql` with table creation, constraints, indexes, triggers, and RLS policies | M2 | survey_2 |
| F8 | Header & View Switcher | App header with branding, stats summary, view switcher toggle (Matrix vs List), and "Nueva Tarea" action | M3 | survey_3 |
| F9 | Task Creation & Edit Modal | Accessible modal with 7 inputs, 1-5 segmented sliders, real-time validation, reset, and live priority preview | M3 | survey_3 |
| F10 | 2x2 Matrix View | Quadrants Q1 (Emergencias), Q2 (Quick Wins), Q3 (Proyectos), Q4 (Postergables); desktop 2x2 grid & mobile responsive tabs | M3 | survey_3 |
| F11 | List View & Dynamic Multi-Filter | Filterable table/list by room, execution type (DIY/Pro), status, and sorted by computed priority score | M3 | survey_3 |
| F12 | Task Card & Quick Status Toggle | Interactive cards with room badges, execution type, cost in ARS, and 1-tap "Listo" status toggle | M3 | survey_3 |
| F13 | Mobile-First UI (360px-1920px) | Strict mobile responsiveness, no horizontal overflow, WCAG 2.1 AA touch targets (>=44px) | M3 | survey_3 |
| F14 | Comprehensive E2E Test Suite | 4-tier test suite (Feature, Boundary, Combinatorial, Real-World) verifying all requirements | E2E Track | E2E Orch |
| F15 | Final Verification & Hardening | 100% E2E test pass, clean `npm run build`, Tier 5 adversarial stress testing | M4 | Final Milestone |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Project Scaffolding & Tooling | Declarative project files, Vite + React + Tailwind + Lucide setup, Git repo & .gitignore, vercel.json | none | DONE |
| M2 | Data Engine & Resilient Storage | Data model, prioritization algorithm, seed tasks, Supabase client + offline fallback, supabase_schema.sql, unit tests | M1 | DONE |
| M3 | UI Views & Responsive Matrix | App layout, Navbar, 2x2 Matrix (desktop grid + mobile tabs), List view with live filters, Task modal/form, card actions | M2 | DONE |
| M4 | Final Integration & E2E Pass | 100% E2E test pass, clean build verification, Tier 5 adversarial hardening | M3, E2E | DONE |
| E2E | E2E Testing Suite (Parallel Track) | Test runner harness, Tiers 1-4 test cases, TEST_READY.md publication | M1 | DONE |

## Interface Contracts

### 1. Data Model (`src/types/task.ts`)
```typescript
export type RoomId = 'cocina' | 'bano' | 'living' | 'dormitorio' | 'exterior' | 'general';
export type ExecutionType = 'diy' | 'profesional';
export type TaskStatus = 'pendiente' | 'en_proceso' | 'listo';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type QuadrantId = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Task {
  id: string;
  title: string;
  room: RoomId;
  urgency: number; // 1 to 5
  effort: number;  // 1 to 5
  cost?: number | null;
  execution_type: ExecutionType;
  status: TaskStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ComputedTask extends Task {
  priority: PriorityLevel;
  quadrant: QuadrantId;
  priority_score: number; // 0.00 to 100.00
}
```

### 2. Prioritization Engine (`src/services/prioritizer.ts`)
```typescript
export function calculatePriority(urgency: number, effort: number, cost?: number | null): PriorityLevel;
export function calculateQuadrant(urgency: number, effort: number): QuadrantId;
export function calculatePriorityScore(urgency: number, effort: number, cost?: number | null, status?: TaskStatus): number;
export function enrichTask(task: Task): ComputedTask;
```

### 3. Storage & Sync Service (`src/services/storage.ts`)
```typescript
export interface StorageService {
  getTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  toggleTaskStatus(id: string): Promise<Task>;
  resetToSeed(): Promise<Task[]>;
}
```

## Code Layout
```
c:\Users\Usuario\OneDrive\Desktop\Proyecto casa/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vercel.json
├── .gitignore
├── .env.example
├── supabase_schema.sql
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── task.ts
│   ├── data/
│   │   └── seedTasks.ts
│   ├── services/
│   │   ├── prioritizer.ts
│   │   ├── supabase.ts
│   │   └── storage.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── cn.ts
│   └── components/
│       ├── Navbar.tsx
│       ├── MatrixView.tsx
│       ├── ListView.tsx
│       ├── TaskCard.tsx
│       ├── TaskModal.tsx
│       └── Toast.tsx
└── tests/
    ├── e2e/
    │   ├── runner.ts
    │   ├── tier1_features.test.ts
    │   ├── tier2_boundaries.test.ts
    │   ├── tier3_combinations.test.ts
    │   └── tier4_real_world.test.ts
    └── unit/
        ├── prioritizer.test.ts
        └── storage.test.ts
```
