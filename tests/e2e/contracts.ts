/**
 * HomeFix E2E Test Suite - Authoritative Contracts, Domain Models, and Reference Oracles
 * 
 * Derived from:
 * - ORIGINAL_REQUEST.md (Requirements R1-R5, Acceptance Criteria)
 * - PROJECT.md (Interface Contracts, Milestones, Code Layout)
 * - survey_report.md (Data Architecture, 25-cell Truth Table, Scoring Formula, Sync Architecture)
 * - spec_report.md (UI/UX Specification, 2x2 Matrix, Multi-Filters, WCAG AA standards)
 */

export type RoomId = 'cocina' | 'baño' | 'bano' | 'living' | 'dormitorio' | 'exterior' | 'general';
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
  priority_label: string;
  quadrant_title: string;
}

export const VALID_ROOMS: RoomId[] = ['cocina', 'baño', 'bano', 'living', 'dormitorio', 'exterior', 'general'];
export const VALID_EXECUTION_TYPES: ExecutionType[] = ['diy', 'profesional'];
export const VALID_STATUSES: TaskStatus[] = ['pendiente', 'en_proceso', 'listo'];
export const HIGH_COST_THRESHOLD = 50000;

/**
 * Normalizes room name for diacritic tolerance ('bano' -> 'baño')
 */
export function normalizeRoom(room: string): RoomId {
  const r = room.toLowerCase().trim();
  if (r === 'bano' || r === 'baño') return 'baño';
  if (VALID_ROOMS.includes(r as RoomId)) return r as RoomId;
  throw new Error(`Invalid room identifier: ${room}`);
}

/**
 * Validates task payload against HomeFix schema constraints
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateTaskInput(input: Partial<Task>): ValidationResult {
  const errors: Record<string, string> = {};

  // Title validation
  if (!input.title || typeof input.title !== 'string') {
    errors.title = 'El título es requerido';
  } else {
    const trimmed = input.title.trim();
    if (trimmed.length < 3) {
      errors.title = 'El título debe tener al menos 3 caracteres';
    } else if (trimmed.length > 120) {
      errors.title = 'El título no puede exceder los 120 caracteres';
    }
  }

  // Room validation
  if (!input.room) {
    errors.room = 'El ambiente es requerido';
  } else {
    const r = input.room.toLowerCase().trim();
    if (!VALID_ROOMS.includes(r as RoomId)) {
      errors.room = `Ambiente inválido: ${input.room}`;
    }
  }

  // Urgency validation (1 to 5)
  if (input.urgency === undefined || input.urgency === null) {
    errors.urgency = 'La urgencia es requerida';
  } else if (!Number.isInteger(input.urgency) || input.urgency < 1 || input.urgency > 5) {
    errors.urgency = 'La urgencia debe ser un entero entre 1 y 5';
  }

  // Effort validation (1 to 5)
  if (input.effort === undefined || input.effort === null) {
    errors.effort = 'El esfuerzo es requerido';
  } else if (!Number.isInteger(input.effort) || input.effort < 1 || input.effort > 5) {
    errors.effort = 'El esfuerzo debe ser un entero entre 1 y 5';
  }

  // Cost validation (optional, >= 0, <= 99,999,999)
  if (input.cost !== undefined && input.cost !== null) {
    if (typeof input.cost !== 'number' || isNaN(input.cost) || input.cost < 0) {
      errors.cost = 'El costo debe ser un número mayor o igual a 0';
    } else if (input.cost > 99999999) {
      errors.cost = 'El costo excede el límite permitido';
    }
  }

  // Execution type validation
  if (!input.execution_type) {
    errors.execution_type = 'El tipo de ejecución es requerido';
  } else if (!VALID_EXECUTION_TYPES.includes(input.execution_type)) {
    errors.execution_type = `Tipo de ejecución inválido: ${input.execution_type}`;
  }

  // Status validation
  if (input.status && !VALID_STATUSES.includes(input.status)) {
    errors.status = `Estado inválido: ${input.status}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Reference Oracle: Categorical Priority Calculation
 * Rules:
 * - Low effort (<= 2):
 *   - Urgency >= 3 -> P2 (Quick Win) [Acceptance Criteria: Urg >= 4 + low effort is P2]
 *   - Urgency < 3:
 *     - Cost >= 50,000 -> P3 (Planned Project)
 *     - Else -> P4 (Postergable)
 * - High effort (>= 3):
 *   - Urgency >= 4 -> P1 (Emergencia / Crítico)
 *   - Urgency < 4 -> P3 (Proyecto Planificado)
 */
export function referenceCalculatePriority(urgency: number, effort: number, cost: number | null = 0): PriorityLevel {
  if (effort <= 2) {
    if (urgency >= 3) {
      return 'P2';
    }
    if (cost && cost >= HIGH_COST_THRESHOLD) {
      return 'P3';
    }
    return 'P4';
  }

  // High effort (3, 4, 5)
  if (urgency >= 4) {
    return 'P1';
  }
  return 'P3';
}

/**
 * Reference Oracle: 2x2 Matrix Quadrant Calculation
 * Q1: Urgencia >= 3 and Esfuerzo >= 3 (Emergencias)
 * Q2: Urgencia >= 3 and Esfuerzo <= 2 (Victorias Rápidas)
 * Q3: Urgencia <= 2 and Esfuerzo >= 3 (Proyectos a Planificar)
 * Q4: Urgencia <= 2 and Esfuerzo <= 2 (Tareas Menores / Postergables)
 */
export function referenceCalculateQuadrant(urgency: number, effort: number, cost: number | null = 0): QuadrantId {
  if (effort <= 2) {
    if (urgency >= 3) {
      return 'Q2';
    }
    if (cost && cost >= HIGH_COST_THRESHOLD) {
      return 'Q3';
    }
    return 'Q4';
  }

  // High effort (3, 4, 5)
  if (urgency >= 4) {
    return 'Q1';
  }
  return 'Q3';
}

export function getQuadrantTitle(quadrant: QuadrantId): string {
  switch (quadrant) {
    case 'Q1': return 'Q1 — Emergencias / Crítico';
    case 'Q2': return 'Q2 — Victorias Rápidas (Quick Wins)';
    case 'Q3': return 'Q3 — Proyectos a Planificar';
    case 'Q4': return 'Q4 — Tareas Menores / Postergables';
  }
}

export function getPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case 'P1': return 'P1 - Emergencia / Crítico';
    case 'P2': return 'P2 - Quick Win';
    case 'P3': return 'P3 - Proyecto Planificado';
    case 'P4': return 'P4 - Postergable';
  }
}

/**
 * Reference Oracle: Continuous Ranking Score Formula (0.00 to 100.00)
 * S = ((BaseTier + 10*urgency + 4*(6-effort) + CostBonus) / 5) * StatusModifier
 */
export function referenceCalculatePriorityScore(
  urgency: number,
  effort: number,
  cost: number | null = 0,
  status: TaskStatus = 'pendiente'
): number {
  const priority = referenceCalculatePriority(urgency, effort, cost);

  const TIER_BASE: Record<PriorityLevel, number> = {
    P1: 400,
    P2: 300,
    P3: 200,
    P4: 100
  };

  const baseTier = TIER_BASE[priority];
  const urgencyPoints = urgency * 10;
  const invertedEffort = (6 - effort) * 4;
  const costBonus = Math.min(10, Math.round((cost || 0) / 10000));

  let score = (baseTier + urgencyPoints + invertedEffort + costBonus) / 5;

  if (status === 'listo') {
    score = score * 0.2; // 80% penalty for completed tasks
  }

  return Number(score.toFixed(2));
}

/**
 * Computes full task enrichment
 */
export function referenceEnrichTask(task: Task): ComputedTask {
  const priority = referenceCalculatePriority(task.urgency, task.effort, task.cost);
  const quadrant = referenceCalculateQuadrant(task.urgency, task.effort, task.cost);
  const priority_score = referenceCalculatePriorityScore(task.urgency, task.effort, task.cost, task.status);

  return {
    ...task,
    priority,
    quadrant,
    priority_score,
    priority_label: getPriorityLabel(priority),
    quadrant_title: getQuadrantTitle(quadrant)
  };
}

/**
 * Currency Formatter: Argentine Pesos ($ 15.000)
 */
export function formatCurrencyARS(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'Sin costo estimado';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${formatted}`;
}

/**
 * Standard Representative Seed Tasks
 */
export const SEED_TASKS: Task[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Pérdida de agua bajo la bacha de cocina',
    room: 'cocina',
    urgency: 5,
    effort: 2,
    cost: 8500.00,
    execution_type: 'diy',
    status: 'pendiente',
    created_at: '2026-09-24T12:00:00.000Z',
    updated_at: '2026-09-24T12:00:00.000Z'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Reparación de filtración y grieta en techo de living',
    room: 'living',
    urgency: 4,
    effort: 5,
    cost: 120000.00,
    execution_type: 'profesional',
    status: 'en_proceso',
    created_at: '2026-09-24T12:10:00.000Z',
    updated_at: '2026-09-24T12:10:00.000Z'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Ajustar picaporte flojo y lubricar cerradura',
    room: 'dormitorio',
    urgency: 2,
    effort: 1,
    cost: 0.00,
    execution_type: 'diy',
    status: 'pendiente',
    created_at: '2026-09-24T12:20:00.000Z',
    updated_at: '2026-09-24T12:20:00.000Z'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Instalar estanterías flotantes y organizador de baño',
    room: 'baño',
    urgency: 2,
    effort: 3,
    cost: 45000.00,
    execution_type: 'diy',
    status: 'pendiente',
    created_at: '2026-09-24T12:30:00.000Z',
    updated_at: '2026-09-24T12:30:00.000Z'
  }
];

/**
 * In-Memory Mock of LocalStorage for Headless/Node Testing
 */
export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  public getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public get length(): number {
    return this.store.size;
  }

  public key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

/**
 * Simulated Resilient Offline-First Storage Service
 */
export interface PendingMutation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  taskId: string;
  payload?: Partial<Task>;
  timestamp: string;
  retryCount: number;
}

export class ResilientStorageSimulator {
  private storage: MockLocalStorage;
  public isOnline: boolean = true;
  public mockRemoteError: boolean = false;
  public remoteStore: Map<string, Task> = new Map();
  public pendingMutations: PendingMutation[] = [];

  constructor(storage?: MockLocalStorage) {
    this.storage = storage || new MockLocalStorage();
    // Pre-populate remote with seed tasks
    for (const seed of SEED_TASKS) {
      this.remoteStore.set(seed.id, { ...seed });
    }
  }

  public getCache(): Task[] {
    const raw = this.storage.getItem('homefix_tasks_cache_v1');
    if (!raw) {
      const initial = [...SEED_TASKS];
      this.storage.setItem('homefix_tasks_cache_v1', JSON.stringify(initial));
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      const initial = [...SEED_TASKS];
      this.storage.setItem('homefix_tasks_cache_v1', JSON.stringify(initial));
      return initial;
    } catch {
      const initial = [...SEED_TASKS];
      this.storage.setItem('homefix_tasks_cache_v1', JSON.stringify(initial));
      return initial;
    }
  }

  public setCache(tasks: Task[]): void {
    this.storage.setItem('homefix_tasks_cache_v1', JSON.stringify(tasks));
  }

  public async getTasks(): Promise<Task[]> {
    // 1. If cache is empty, hydrate with seeds
    let cached = this.getCache();
    if (cached.length === 0) {
      cached = [...SEED_TASKS];
      this.setCache(cached);
    }

    // 2. If online and no remote error, simulate remote reconcile
    if (this.isOnline && !this.mockRemoteError) {
      const remoteList = Array.from(this.remoteStore.values());
      // Merge with Last-Write-Wins
      const mergedMap = new Map<string, Task>();
      for (const t of cached) mergedMap.set(t.id, t);
      for (const r of remoteList) {
        const local = mergedMap.get(r.id);
        if (!local || (r.updated_at && local.updated_at && r.updated_at >= local.updated_at)) {
          mergedMap.set(r.id, r);
        }
      }
      const merged = Array.from(mergedMap.values());
      this.setCache(merged);
      return merged;
    }

    // 3. Fallback to cache
    return cached;
  }

  public async createTask(taskInput: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const val = validateTaskInput(taskInput);
    if (!val.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(val.errors)}`);
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskInput,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: now,
      updated_at: now
    };

    // Optimistic local cache update
    const current = this.getCache();
    const updated = [newTask, ...current];
    this.setCache(updated);

    // Remote sync or enqueue
    if (this.isOnline && !this.mockRemoteError) {
      this.remoteStore.set(newTask.id, { ...newTask });
    } else {
      this.pendingMutations.push({
        id: `mut-${Date.now()}`,
        type: 'INSERT',
        taskId: newTask.id,
        payload: newTask,
        timestamp: now,
        retryCount: 0
      });
    }

    return newTask;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const current = this.getCache();
    const idx = current.findIndex(t => t.id === id);
    if (idx === -1) {
      throw new Error(`Task not found: ${id}`);
    }

    const updatedTask: Task = {
      ...current[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    const val = validateTaskInput(updatedTask);
    if (!val.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(val.errors)}`);
    }

    current[idx] = updatedTask;
    this.setCache(current);

    if (this.isOnline && !this.mockRemoteError) {
      this.remoteStore.set(id, { ...updatedTask });
    } else {
      this.pendingMutations.push({
        id: `mut-${Date.now()}`,
        type: 'UPDATE',
        taskId: id,
        payload: updates,
        timestamp: updatedTask.updated_at!,
        retryCount: 0
      });
    }

    return updatedTask;
  }

  public async toggleTaskStatus(id: string): Promise<Task> {
    const current = this.getCache();
    const task = current.find(t => t.id === id);
    if (!task) throw new Error(`Task not found: ${id}`);

    const newStatus: TaskStatus = task.status === 'listo' ? 'pendiente' : 'listo';
    return this.updateTask(id, { status: newStatus });
  }

  public async deleteTask(id: string): Promise<void> {
    const current = this.getCache();
    const updated = current.filter(t => t.id !== id);
    this.setCache(updated);

    if (this.isOnline && !this.mockRemoteError) {
      this.remoteStore.delete(id);
    } else {
      this.pendingMutations.push({
        id: `mut-${Date.now()}`,
        type: 'DELETE',
        taskId: id,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
    }
  }

  public async drainMutationQueue(): Promise<number> {
    if (!this.isOnline || this.mockRemoteError) return 0;
    let drained = 0;
    while (this.pendingMutations.length > 0) {
      const mut = this.pendingMutations.shift()!;
      if (mut.type === 'INSERT') {
        this.remoteStore.set(mut.taskId, mut.payload as Task);
      } else if (mut.type === 'UPDATE') {
        const existing = this.remoteStore.get(mut.taskId);
        if (existing) {
          this.remoteStore.set(mut.taskId, { ...existing, ...mut.payload });
        }
      } else if (mut.type === 'DELETE') {
        this.remoteStore.delete(mut.taskId);
      }
      drained++;
    }
    return drained;
  }
}
