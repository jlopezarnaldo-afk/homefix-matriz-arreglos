/**
 * HomeFix E2E Test Suite — Tier 2: Boundary & Corner Cases
 * 
 * Tests extreme boundaries, limits, empty values, coordinate partitions,
 * and robust handling of invalid inputs.
 */

import { describe, test, expect, setTier } from './harness.ts';
import type { Task } from './contracts.ts';
import {
  validateTaskInput,
  referenceCalculatePriority,
  referenceCalculateQuadrant,
  referenceCalculatePriorityScore,
  HIGH_COST_THRESHOLD,
  ResilientStorageSimulator,
  MockLocalStorage
} from './contracts.ts';

setTier('Tier 2: Boundary & Corner Cases');

describe('B1: Urgency Boundary & Limit Conditions', () => {
  test('T2.1.1 - Exact lower boundary: Urgency = 1 is accepted and valid', () => {
    const res = validateTaskInput({ title: 'Ajuste estético', room: 'living', urgency: 1, effort: 1, execution_type: 'diy' });
    expect(res.valid).toBeTruthy();
    expect(res.errors.urgency).toBeUndefined();
  });

  test('T2.1.2 - Exact upper boundary: Urgency = 5 is accepted and valid', () => {
    const res = validateTaskInput({ title: 'Riesgo inminente de gas', room: 'cocina', urgency: 5, effort: 3, execution_type: 'profesional' });
    expect(res.valid).toBeTruthy();
    expect(res.errors.urgency).toBeUndefined();
  });

  test('T2.1.3 - Below lower boundary: Urgency = 0 is rejected with validation error', () => {
    const res = validateTaskInput({ title: 'Test 0 Urgency', room: 'cocina', urgency: 0, effort: 1, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.urgency).toBeDefined();
  });

  test('T2.1.4 - Above upper boundary: Urgency = 6 is rejected with validation error', () => {
    const res = validateTaskInput({ title: 'Test 6 Urgency', room: 'cocina', urgency: 6, effort: 1, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.urgency).toBeDefined();
  });

  test('T2.1.5 - Float boundary: Urgency = 3.5 is rejected (integers 1-5 only)', () => {
    const res = validateTaskInput({ title: 'Test Float Urgency', room: 'cocina', urgency: 3.5 as any, effort: 1, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.urgency).toBeDefined();
  });
});

describe('B2: Effort Boundary & Limit Conditions', () => {
  test('T2.2.1 - Exact lower boundary: Effort = 1 is accepted and valid', () => {
    const res = validateTaskInput({ title: 'Cambiar lámpara', room: 'dormitorio', urgency: 1, effort: 1, execution_type: 'diy' });
    expect(res.valid).toBeTruthy();
    expect(res.errors.effort).toBeUndefined();
  });

  test('T2.2.2 - Exact upper boundary: Effort = 5 is accepted and valid', () => {
    const res = validateTaskInput({ title: 'Recableado completo', room: 'general', urgency: 4, effort: 5, execution_type: 'profesional' });
    expect(res.valid).toBeTruthy();
    expect(res.errors.effort).toBeUndefined();
  });

  test('T2.2.3 - Below lower boundary: Effort = 0 is rejected with validation error', () => {
    const res = validateTaskInput({ title: 'Test 0 Effort', room: 'cocina', urgency: 2, effort: 0, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.effort).toBeDefined();
  });

  test('T2.2.4 - Above upper boundary: Effort = 6 is rejected with validation error', () => {
    const res = validateTaskInput({ title: 'Test 6 Effort', room: 'cocina', urgency: 2, effort: 6, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.effort).toBeDefined();
  });

  test('T2.2.5 - Float boundary: Effort = 2.8 is rejected (integers 1-5 only)', () => {
    const res = validateTaskInput({ title: 'Test Float Effort', room: 'cocina', urgency: 2, effort: 2.8 as any, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.effort).toBeDefined();
  });
});

describe('B3: Cost Boundaries & High Threshold Promotions', () => {
  test('T2.3.1 - Zero cost boundary: Cost = 0 is accepted without error', () => {
    const res = validateTaskInput({ title: 'Ajuste sin costo', room: 'living', urgency: 2, effort: 1, cost: 0, execution_type: 'diy' });
    expect(res.valid).toBeTruthy();
    expect(res.errors.cost).toBeUndefined();
  });

  test('T2.3.2 - Null / Undefined cost boundary: accepts optional cost', () => {
    const resNull = validateTaskInput({ title: 'Costo nulo', room: 'living', urgency: 2, effort: 1, cost: null, execution_type: 'diy' });
    expect(resNull.valid).toBeTruthy();
    const resUndef = validateTaskInput({ title: 'Costo indefinido', room: 'living', urgency: 2, effort: 1, execution_type: 'diy' });
    expect(resUndef.valid).toBeTruthy();
  });

  test('T2.3.3 - Negative cost boundary: Cost = -50 is rejected', () => {
    const res = validateTaskInput({ title: 'Costo negativo', room: 'living', urgency: 2, effort: 1, cost: -50, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.cost).toBeDefined();
  });

  test('T2.3.4 - High cost promotion threshold ($50,000): promotes low urgency task to P3', () => {
    // Under threshold ($49,999) -> P4
    const under = referenceCalculatePriority(2, 2, 49999);
    expect(under).toBe('P4');

    // At or above threshold ($50,000) -> P3 (Planned Project)
    const atThreshold = referenceCalculatePriority(2, 2, 50000);
    expect(atThreshold).toBe('P3');

    const aboveThreshold = referenceCalculatePriority(1, 1, 150000);
    expect(aboveThreshold).toBe('P3');
  });

  test('T2.3.5 - Extreme upper cost boundary: $99,999,999 is accepted and cost bonus is capped', () => {
    const res = validateTaskInput({ title: 'Obra monumental', room: 'general', urgency: 3, effort: 5, cost: 99999999, execution_type: 'profesional' });
    expect(res.valid).toBeTruthy();

    // Bonus points in score formula cannot exceed 10
    const score = referenceCalculatePriorityScore(3, 5, 99999999, 'pendiente');
    const scoreMaxBonus = referenceCalculatePriorityScore(3, 5, 100000, 'pendiente');
    expect(score).toBe(scoreMaxBonus); // Both cap at +10 bonus points
  });
});

describe('B4: Title Length & Whitespace Boundaries', () => {
  test('T2.4.1 - Exact minimum length boundary: 3 characters is accepted', () => {
    const res = validateTaskInput({ title: 'Gas', room: 'cocina', urgency: 5, effort: 3, execution_type: 'profesional' });
    expect(res.valid).toBeTruthy();
  });

  test('T2.4.2 - Below minimum length boundary: 2 characters is rejected', () => {
    const res = validateTaskInput({ title: 'No', room: 'cocina', urgency: 5, effort: 3, execution_type: 'profesional' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.title).toBeDefined();
  });

  test('T2.4.3 - Exact maximum length boundary: 120 characters is accepted', () => {
    const longTitle = 'R'.repeat(120);
    const res = validateTaskInput({ title: longTitle, room: 'general', urgency: 3, effort: 3, execution_type: 'diy' });
    expect(res.valid).toBeTruthy();
  });

  test('T2.4.4 - Above maximum length boundary: 121 characters is rejected', () => {
    const tooLongTitle = 'R'.repeat(121);
    const res = validateTaskInput({ title: tooLongTitle, room: 'general', urgency: 3, effort: 3, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.title).toBeDefined();
  });

  test('T2.4.5 - Whitespace-only title is trimmed to 0 length and rejected', () => {
    const res = validateTaskInput({ title: '     ', room: 'cocina', urgency: 3, effort: 2, execution_type: 'diy' });
    expect(res.valid).toBeFalsy();
    expect(res.errors.title).toBeDefined();
  });
});

describe('B5: Edge Coordinates & Quadrant Partition Boundaries', () => {
  test('T2.5.1 - Center coordinate boundary (Urg=3, Eff=3) classifies into Q3 (Proyectos Planificados)', () => {
    expect(referenceCalculateQuadrant(3, 3)).toBe('Q3');
  });

  test('T2.5.2 - High urgency low effort boundary (Urg=4, Eff=2) classifies into Q2 (Quick Win)', () => {
    expect(referenceCalculateQuadrant(4, 2)).toBe('Q2');
    expect(referenceCalculatePriority(4, 2)).toBe('P2');
  });

  test('T2.5.3 - Extreme Quick Win corner (Urg=5, Eff=1) yields maximum Quick Win score', () => {
    expect(referenceCalculateQuadrant(5, 1)).toBe('Q2');
    expect(referenceCalculatePriority(5, 1)).toBe('P2');
    const score = referenceCalculatePriorityScore(5, 1, 0, 'pendiente');
    expect(score).toBe(74.00);
  });

  test('T2.5.4 - Extreme Planned Project corner (Urg=1, Eff=5) yields lowest urgency Q3', () => {
    expect(referenceCalculateQuadrant(1, 5)).toBe('Q3');
    expect(referenceCalculatePriority(1, 5)).toBe('P3');
    const score = referenceCalculatePriorityScore(1, 5, 0, 'pendiente');
    expect(score).toBe(42.80);
  });

  test('T2.5.5 - Low urgency boundary (Urg=2, Eff=2) without high cost classifies into Q4/P4', () => {
    expect(referenceCalculateQuadrant(2, 2)).toBe('Q4');
    expect(referenceCalculatePriority(2, 2, 0)).toBe('P4');
    const score = referenceCalculatePriorityScore(2, 2, 0, 'pendiente');
    expect(score).toBe(27.20);
  });
});

describe('B6: Storage & Payload Boundary Conditions', () => {
  test('T2.6.1 - Corrupted JSON in localStorage falls back cleanly to empty or seed array', async () => {
    const mockStorage = new MockLocalStorage();
    mockStorage.setItem('homefix_tasks_cache_v1', '{ invalid json [');
    const sim = new ResilientStorageSimulator(mockStorage);
    const tasks = await sim.getTasks();
    expect(Array.isArray(tasks)).toBeTruthy();
  });

  test('T2.6.2 - Special characters, accents, and emojis in title preserve encoding integrity', async () => {
    const sim = new ResilientStorageSimulator();
    const titleWithSpecialChars = 'Gotera en caño bajo bacha de cocina 💧 y cerradura trabada 🔑 (¡Urgente!)';
    const task = await sim.createTask({
      title: titleWithSpecialChars,
      room: 'cocina',
      urgency: 4,
      effort: 2,
      execution_type: 'diy',
      status: 'pendiente'
    });
    expect(task.title).toBe(titleWithSpecialChars);
    const retrieved = (await sim.getTasks()).find(t => t.id === task.id);
    expect(retrieved?.title).toBe(titleWithSpecialChars);
  });

  test('T2.6.3 - Attempting to update a non-existent task ID throws descriptive error', async () => {
    const sim = new ResilientStorageSimulator();
    let threw = false;
    try {
      await sim.updateTask('non-existent-id-999', { title: 'New Title' });
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain('Task not found');
    }
    expect(threw).toBeTruthy();
  });

  test('T2.6.4 - Creating task with missing mandatory fields throws validation exception', async () => {
    const sim = new ResilientStorageSimulator();
    let threw = false;
    try {
      await sim.createTask({ title: '' } as any);
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain('Validation failed');
    }
    expect(threw).toBeTruthy();
  });

  test('T2.6.5 - Offline pending mutations preserve chronological ordering for multiple operations', async () => {
    const sim = new ResilientStorageSimulator();
    sim.isOnline = false;

    const t1 = await sim.createTask({ title: 'Task Alpha', room: 'cocina', urgency: 3, effort: 2, execution_type: 'diy', status: 'pendiente' });
    await sim.toggleTaskStatus(t1.id);
    await sim.deleteTask(t1.id);

    expect(sim.pendingMutations.length).toBe(3);
    expect(sim.pendingMutations[0].type).toBe('INSERT');
    expect(sim.pendingMutations[1].type).toBe('UPDATE');
    expect(sim.pendingMutations[2].type).toBe('DELETE');
  });
});
