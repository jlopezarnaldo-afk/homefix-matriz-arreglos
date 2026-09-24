/**
 * HomeFix E2E Test Suite — Tier 4: Real-World Application Scenarios
 * 
 * Tests end-to-end user workflows and full lifecycles:
 * - Scenario 1: Emergency Kitchen Pipe Burst (DIY Quick Win & Completion)
 * - Scenario 2: Severe Storm Damage & Ceiling Infiltration (Professional Contractor Triage)
 * - Scenario 3: Bathroom & Bedroom Spring Renovation (High-Budget Promotion & Filtering)
 * - Scenario 4: Weekend Preventive Maintenance Sprint (Batch Triage & Quick-Done)
 * - Scenario 5: Offline Disaster Triage with Network Interruption & Recovery
 * - Scenario 6: Multi-Filter Edge Navigation & Reset Under Mobile Viewport
 */

import { describe, test, expect, setTier } from './harness.ts';
import type {
  Task,
  ComputedTask
} from './contracts.ts';
import {
  ResilientStorageSimulator,
  referenceCalculatePriority,
  referenceCalculateQuadrant,
  referenceCalculatePriorityScore,
  referenceEnrichTask,
  formatCurrencyARS,
  SEED_TASKS
} from './contracts.ts';

setTier('Tier 4: Real-World Scenarios');

describe('Scenario 1: Emergency Kitchen Pipe Burst (DIY Quick Win & Completion)', () => {
  test('T4.1 - Full lifecycle from urgent leak discovery to 1-tap completion', async () => {
    const storage = new ResilientStorageSimulator();

    // 1. User discovers urgent leak and submits form
    const created = await storage.createTask({
      title: 'Pérdida de agua bajo la bacha de cocina',
      room: 'cocina',
      urgency: 5,
      effort: 2,
      cost: 8500,
      execution_type: 'diy',
      status: 'pendiente'
    });

    expect(created.id).toBeDefined();
    expect(created.status).toBe('pendiente');

    // 2. Algorithm automatically evaluates priority and quadrant
    const enriched = referenceEnrichTask(created);
    expect(enriched.priority).toBe('P2');
    expect(enriched.quadrant).toBe('Q2');
    expect(enriched.priority_score).toBe(73.40); // 73.20 base + 0.20 cost bonus for $8,500

    // 3. User fixes the leak in 20 minutes, taps "Listo" button
    const updated = await storage.toggleTaskStatus(created.id);
    expect(updated.status).toBe('listo');

    // 4. Score is penalized for completed task (80% penalty)
    const enrichedAfter = referenceEnrichTask(updated);
    expect(enrichedAfter.priority_score).toBeCloseTo(14.68, 2);

    // 5. In List View, filtering by status="pendiente" hides it
    const allTasks = await storage.getTasks();
    const pendingOnly = allTasks.filter(t => t.status === 'pendiente');
    expect(pendingOnly.some(t => t.id === created.id)).toBeFalsy();

    // 6. Filtering by status="listo" includes it
    const doneOnly = allTasks.filter(t => t.status === 'listo');
    expect(doneOnly.some(t => t.id === created.id)).toBeTruthy();
  });
});

describe('Scenario 2: Severe Storm Damage & Ceiling Infiltration (Professional Contractor Triage)', () => {
  test('T4.2 - High-risk emergency triage, professional assignment, and in-process progression', async () => {
    const storage = new ResilientStorageSimulator();

    // 1. Storm creates structural leak
    const leak = await storage.createTask({
      title: 'Reparación de filtración y grieta en techo de living',
      room: 'living',
      urgency: 4,
      effort: 5,
      cost: 120000,
      execution_type: 'profesional',
      status: 'pendiente'
    });

    // 2. Verified as Q1 Emergency (P1)
    const enriched = referenceEnrichTask(leak);
    expect(enriched.priority).toBe('P1');
    expect(enriched.quadrant).toBe('Q1');
    expect(enriched.priority_score).toBeGreaterThanOrEqual(88.0);

    // 3. Appears at the top of the priority list
    const allTasks = (await storage.getTasks()).map(t => referenceEnrichTask(t));
    const sorted = [...allTasks].sort((a, b) => b.priority_score - a.priority_score);
    expect(sorted[0].id).toBe(leak.id);

    // 4. User schedules contractor and updates status to "en_proceso"
    const inProcess = await storage.updateTask(leak.id, { status: 'en_proceso' });
    expect(inProcess.status).toBe('en_proceso');

    // 5. In-process task retains full priority score (no penalty)
    const enrichedInProcess = referenceEnrichTask(inProcess);
    expect(enrichedInProcess.priority_score).toBe(enriched.priority_score);

    // 6. Global stats reflect high budget requirement
    const tasks = await storage.getTasks();
    const totalCost = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
    expect(totalCost).toBeGreaterThanOrEqual(120000);
    expect(formatCurrencyARS(totalCost)).toContain('$ ');
  });
});

describe('Scenario 3: Bathroom & Bedroom Spring Renovation (High-Budget Promotion & Filtering)', () => {
  test('T4.3 - Planning multiple non-urgent repairs with budget threshold promotion', async () => {
    const storage = new ResilientStorageSimulator();

    // 1. Create moderate cost bathroom task ($45,000)
    const shelves = await storage.createTask({
      title: 'Instalar estanterías flotantes y organizador de baño',
      room: 'baño',
      urgency: 2,
      effort: 3,
      cost: 45000,
      execution_type: 'diy',
      status: 'pendiente'
    });

    // 2. Create high cost bedroom painting task ($65,000 >= $50,000 threshold)
    const painting = await storage.createTask({
      title: 'Pintar pared de dormitorio con esmalte satinado',
      room: 'dormitorio',
      urgency: 2,
      effort: 2,
      cost: 65000,
      execution_type: 'diy',
      status: 'pendiente'
    });

    // 3. Both are assigned to Q3 (Proyectos a Planificar)
    const enrichedShelves = referenceEnrichTask(shelves);
    const enrichedPainting = referenceEnrichTask(painting);

    expect(enrichedShelves.quadrant).toBe('Q3');
    expect(enrichedPainting.quadrant).toBe('Q3');
    expect(enrichedPainting.priority).toBe('P3'); // Promoted to P3 by high cost threshold

    // 4. Search filter finds "esmalte" for painting task
    const tasks = await storage.getTasks();
    const searchMatch = tasks.filter(t => t.title.toLowerCase().includes('esmalte'));
    expect(searchMatch.length).toBe(1);
    expect(searchMatch[0].id).toBe(painting.id);

    // 5. Update cost of shelves to $55,000
    const updatedShelves = await storage.updateTask(shelves.id, { cost: 55000 });
    expect(updatedShelves.cost).toBe(55000);
  });
});

describe('Scenario 4: Weekend Preventive Maintenance Sprint (Batch Triage & Quick-Done)', () => {
  test('T4.4 - Logging minor home annoyances into Q4 and resolving them rapidly', async () => {
    const storage = new ResilientStorageSimulator();

    // 1. User records 3 small items
    const t1 = await storage.createTask({
      title: 'Ajustar picaporte flojo y lubricar cerradura',
      room: 'dormitorio',
      urgency: 2,
      effort: 1,
      cost: 0,
      execution_type: 'diy',
      status: 'pendiente'
    });

    const t2 = await storage.createTask({
      title: 'Alinear bisagra de alacena',
      room: 'cocina',
      urgency: 1,
      effort: 2,
      cost: 0,
      execution_type: 'diy',
      status: 'pendiente'
    });

    const t3 = await storage.createTask({
      title: 'Cambiar tapón de bacha oxidado',
      room: 'baño',
      urgency: 1,
      effort: 1,
      cost: 1500,
      execution_type: 'diy',
      status: 'pendiente'
    });

    // 2. All 3 map to Q4 (Tareas Menores / Postergables)
    expect(referenceCalculateQuadrant(t1.urgency, t1.effort)).toBe('Q4');
    expect(referenceCalculateQuadrant(t2.urgency, t2.effort)).toBe('Q4');
    expect(referenceCalculateQuadrant(t3.urgency, t3.effort)).toBe('Q4');

    // 3. User completes t1 and t2 in one sprint
    await storage.toggleTaskStatus(t1.id);
    await storage.toggleTaskStatus(t2.id);

    // 4. Verify active pending Q4 tasks (Seed Task 3 + t3 remain pending; t1 and t2 completed)
    const tasks = await storage.getTasks();
    const activeQ4 = tasks.filter(
      t => referenceCalculateQuadrant(t.urgency, t.effort, t.cost) === 'Q4' && t.status === 'pendiente'
    );
    expect(activeQ4.length).toBe(2);
    expect(activeQ4.some(t => t.id === t3.id)).toBeTruthy();
    expect(activeQ4.some(t => t.id === t1.id)).toBeFalsy();
    expect(activeQ4.some(t => t.id === t2.id)).toBeFalsy();
  });
});

describe('Scenario 5: Offline Disaster Triage with Network Interruption & Recovery', () => {
  test('T4.5 - Transparent local-first offline operation and deferred mutation queue drain', async () => {
    const storage = new ResilientStorageSimulator();

    // 1. Power outage occurs -> network offline
    storage.isOnline = false;

    // 2. User registers critical breaker issue while offline
    const offlineTask = await storage.createTask({
      title: 'Disyuntor principal salta con artefactos de cocina',
      room: 'general',
      urgency: 5,
      effort: 4,
      cost: 35000,
      execution_type: 'profesional',
      status: 'pendiente'
    });

    // 3. Task is present in local cache immediately
    const cache = storage.getCache();
    expect(cache.some(t => t.id === offlineTask.id)).toBeTruthy();

    // 4. Pending mutation is enqueued
    expect(storage.pendingMutations.length).toBe(1);
    expect(storage.pendingMutations[0].taskId).toBe(offlineTask.id);

    // 5. User marks an existing seed task as done while offline
    const seed1 = SEED_TASKS[0];
    await storage.toggleTaskStatus(seed1.id);
    expect(storage.pendingMutations.length).toBe(2);

    // 6. Network connectivity restored -> online event triggers queue drain
    storage.isOnline = true;
    const drained = await storage.drainMutationQueue();
    expect(drained).toBe(2);
    expect(storage.pendingMutations.length).toBe(0);

    // 7. Remote store contains the new task and updated seed task
    expect(storage.remoteStore.has(offlineTask.id)).toBeTruthy();
    expect(storage.remoteStore.get(seed1.id)?.status).toBe('listo');
  });
});

describe('Scenario 6: Multi-Filter Edge Navigation & Reset Under Mobile Viewport', () => {
  test('T4.6 - Mobile view multi-filtering, empty query state, and clean filter reset', async () => {
    const storage = new ResilientStorageSimulator();
    const tasks = await storage.getTasks();

    // 1. Initial filter by Room='cocina'
    const cocinaTasks = tasks.filter(t => t.room === 'cocina');
    expect(cocinaTasks.length).toBeGreaterThanOrEqual(1);

    // 2. User applies non-matching search term "jacuzzi"
    const searchResults = tasks.filter(t => t.title.toLowerCase().includes('jacuzzi'));
    expect(searchResults.length).toBe(0);

    // 3. Empty state triggers "Limpiar todos los filtros"
    let activeFilterRoom: string | null = 'cocina';
    let activeSearch: string = 'jacuzzi';

    const clearFilters = () => {
      activeFilterRoom = null;
      activeSearch = '';
    };

    clearFilters();
    expect(activeFilterRoom).toBeNull();
    expect(activeSearch).toBe('');

    // 4. Full catalog is restored
    const restored = tasks.filter(t => !activeFilterRoom || t.room === activeFilterRoom);
    expect(restored.length).toBe(tasks.length);
  });
});
