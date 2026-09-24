/**
 * Unit Tests for HomeFix Resilient Storage Service & Offline Coordinator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ResilientStorageCoordinator,
  STORAGE_KEYS
} from '../../src/services/storage';
import { SEED_TASKS } from '../../src/data/seedTasks';
import { validateTask, normalizeRoom } from '../../src/types/task';
import { formatCurrencyARS, formatDate, formatRelativeDate } from '../../src/utils/formatters';
import { cn } from '../../src/utils/cn';

/**
 * Isolated in-memory storage for clean test suites
 */
class TestStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

describe('Storage Service — ResilientStorageCoordinator', () => {
  let mockStore: TestStorage;
  let coordinator: ResilientStorageCoordinator;

  beforeEach(() => {
    mockStore = new TestStorage();
    coordinator = new ResilientStorageCoordinator(mockStore);
    // Use offline mode by default to test local resilience deterministically
    coordinator.forceOffline = true;
  });

  it('hydrates with seed tasks when cache is completely empty', async () => {
    const tasks = await coordinator.getTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks[0].title).toBe(SEED_TASKS[0].title);
    expect(mockStore.getItem(STORAGE_KEYS.TASKS_CACHE)).toBeDefined();
  });

  it('creates a task with generated UUID, timestamps, and persists to cache', async () => {
    const newTask = await coordinator.createTask({
      title: 'Reparar canilla de cocina',
      room: 'cocina',
      urgency: 4,
      effort: 2,
      cost: 12000,
      execution_type: 'diy',
      status: 'pendiente'
    });

    expect(newTask.id).toBeDefined();
    expect(newTask.id.length).toBeGreaterThanOrEqual(16);
    expect(newTask.created_at).toBeDefined();
    expect(newTask.updated_at).toBeDefined();

    const allTasks = await coordinator.getTasks();
    expect(allTasks.some(t => t.id === newTask.id)).toBeTruthy();
  });

  it('throws validation error when creating a task with invalid input', async () => {
    await expect(
      coordinator.createTask({
        title: 'AB', // too short (< 3 chars)
        room: 'cocina',
        urgency: 3,
        effort: 2,
        execution_type: 'diy',
        status: 'pendiente'
      })
    ).rejects.toThrow('Validation failed');
  });

  it('updates an existing task and modifies updated_at timestamp', async () => {
    const tasks = await coordinator.getTasks();
    const target = tasks[0];

    const updated = await coordinator.updateTask(target.id, {
      title: 'Título Modificado Test',
      cost: 99999
    });

    expect(updated.title).toBe('Título Modificado Test');
    expect(updated.cost).toBe(99999);

    const reloaded = await coordinator.getTasks();
    const found = reloaded.find(t => t.id === target.id);
    expect(found?.title).toBe('Título Modificado Test');
  });

  it('throws an error when updating a non-existent task id', async () => {
    await expect(
      coordinator.updateTask('non-existent-id-9999', { title: 'No existo' })
    ).rejects.toThrow('Task not found');
  });

  it('toggles task status from pendiente to listo and back', async () => {
    const tasks = await coordinator.getTasks();
    const target = tasks[0];
    const initialStatus = target.status;

    const toggled = await coordinator.toggleTaskStatus(target.id);
    expect(toggled.status).toBe(initialStatus === 'listo' ? 'pendiente' : 'listo');

    const toggledBack = await coordinator.toggleTaskStatus(target.id);
    expect(toggledBack.status).toBe(initialStatus);
  });

  it('deletes a task from cache', async () => {
    const tasks = await coordinator.getTasks();
    const target = tasks[0];
    const originalCount = tasks.length;

    await coordinator.deleteTask(target.id);

    const reloaded = await coordinator.getTasks();
    expect(reloaded.length).toBe(originalCount - 1);
    expect(reloaded.some(t => t.id === target.id)).toBeFalsy();
  });

  it('resets storage back to initial seed tasks', async () => {
    await coordinator.createTask({
      title: 'Tarea temporal para borrar',
      room: 'living',
      urgency: 2,
      effort: 1,
      execution_type: 'diy',
      status: 'pendiente'
    });

    const resetTasks = await coordinator.resetToSeed();
    expect(resetTasks.length).toBe(SEED_TASKS.length);
    expect(coordinator.getPendingMutations().length).toBe(0);
  });

  it('enqueues mutations into pending mutation queue when offline', async () => {
    coordinator.forceOffline = true;
    const task = await coordinator.createTask({
      title: 'Tarea creada offline',
      room: 'bano',
      urgency: 3,
      effort: 2,
      execution_type: 'diy',
      status: 'pendiente'
    });

    const pending = coordinator.getPendingMutations();
    expect(pending.length).toBe(1);
    expect(pending[0].type).toBe('INSERT');
    expect(pending[0].taskId).toBe(task.id);
  });

  it('falls back gracefully to cache on mock remote error', async () => {
    coordinator.forceOffline = false;
    coordinator.mockRemoteError = true;

    // Should not throw, should return local cache
    const tasks = await coordinator.getTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Validation Helpers — validateTask & normalizeRoom', () => {
  it('accepts valid task inputs', () => {
    const res = validateTask({
      title: 'Cambiar enchufe de pared',
      room: 'living',
      urgency: 3,
      effort: 1,
      cost: 5000,
      execution_type: 'diy',
      status: 'pendiente'
    });
    expect(res.valid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it('rejects invalid title lengths (< 3 or > 120)', () => {
    expect(validateTask({ title: 'A' }).valid).toBe(false);
    expect(validateTask({ title: '   ' }).valid).toBe(false);
    expect(validateTask({ title: 'X'.repeat(121) }).valid).toBe(false);
  });

  it('rejects out of range urgency and effort (outside 1..5)', () => {
    expect(validateTask({ urgency: 0 }).errors.urgency).toBeDefined();
    expect(validateTask({ urgency: 6 }).errors.urgency).toBeDefined();
    expect(validateTask({ effort: 0 }).errors.effort).toBeDefined();
    expect(validateTask({ effort: 6 }).errors.effort).toBeDefined();
  });

  it('normalizes diacritics in room names', () => {
    expect(normalizeRoom('bano')).toBe('baño');
    expect(normalizeRoom('baño')).toBe('baño');
    expect(normalizeRoom('cocina')).toBe('cocina');
  });
});

describe('Utility Formatters & cn', () => {
  it('formats currency in ARS ($ 15.000)', () => {
    expect(formatCurrencyARS(15000)).toBe('$ 15.000');
    expect(formatCurrencyARS(1200000)).toBe('$ 1.200.000');
    expect(formatCurrencyARS(0)).toBe('$ 0');
    expect(formatCurrencyARS(null)).toBe('Sin costo estimado');
    expect(formatCurrencyARS(undefined)).toBe('Sin costo estimado');
  });

  it('formats dates cleanly', () => {
    const formatted = formatDate('2026-09-24T12:00:00.000Z');
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatDate(null)).toBe('-');
  });

  it('formats relative date for recent timestamps', () => {
    const nowIso = new Date().toISOString();
    expect(formatRelativeDate(nowIso)).toBe('hace un momento');
  });

  it('merges classnames without duplicates with cn', () => {
    const merged = cn('p-4 text-red-500', 'p-6', false && 'hidden');
    expect(merged).toContain('p-6');
    expect(merged).not.toContain('p-4');
  });
});
