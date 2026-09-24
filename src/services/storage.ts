/**
 * HomeFix Resilient Storage Service & Offline Sync Coordinator
 * 
 * Provides an offline-first data layer with transparent fallback to localStorage,
 * optimistic UI mutations, and a pending mutation queue for eventual consistency.
 */

import { getSeedTasks } from '../data/seedTasks';
import { validateTask, type Task, type TaskStatus } from '../types/task';
import { supabase } from './supabase';

export const STORAGE_KEYS = {
  TASKS_CACHE: 'homefix_tasks_cache_v1',
  PENDING_MUTATIONS: 'homefix_pending_mutations_v1',
  SYNC_STATUS: 'homefix_sync_status_v1'
} as const;

export interface PendingMutation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  taskId: string;
  payload?: Partial<Task>;
  timestamp: string;
  retryCount: number;
}

export type SyncState = 'online' | 'offline' | 'local_only';

export interface StorageService {
  getTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  toggleTaskStatus(id: string): Promise<Task>;
  resetToSeed(): Promise<Task[]>;
  drainMutationQueue(): Promise<number>;
  getPendingMutations(): PendingMutation[];
  clearPendingMutations(): void;
  getCache(): Task[];
  setCache(tasks: Task[]): void;
}

/**
 * Universal memory storage fallback for headless/Node environments
 */
class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryStorage = new MemoryStorage();

// Safe storage adapter
export function getLocalStorageAdapter(): {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
} {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test localStorage availability (can throw in private browsing)
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Fall back to memoryStorage
  }
  return memoryStorage;
}

/**
 * Generates an RFC4122 v4 compliant UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class ResilientStorageCoordinator implements StorageService {
  private customStorage: ReturnType<typeof getLocalStorageAdapter> | null = null;
  public forceOffline: boolean = false;
  public mockRemoteError: boolean = false;

  constructor(customStorage?: ReturnType<typeof getLocalStorageAdapter>) {
    if (customStorage) {
      this.customStorage = customStorage;
    }
  }

  private get store() {
    return this.customStorage || getLocalStorageAdapter();
  }

  private isOnline(): boolean {
    if (this.forceOffline) return false;
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Retrieves tasks from the local cache. If empty, seeds default tasks.
   */
  public getCache(): Task[] {
    const raw = this.store.getItem(STORAGE_KEYS.TASKS_CACHE);
    if (!raw) {
      const initial = getSeedTasks();
      this.setCache(initial);
      return initial;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      const initial = getSeedTasks();
      this.setCache(initial);
      return initial;
    } catch {
      const initial = getSeedTasks();
      this.setCache(initial);
      return initial;
    }
  }

  /**
   * Persists tasks array into local cache.
   */
  public setCache(tasks: Task[]): void {
    this.store.setItem(STORAGE_KEYS.TASKS_CACHE, JSON.stringify(tasks));
  }

  /**
   * Reads pending mutations queue.
   */
  public getPendingMutations(): PendingMutation[] {
    const raw = this.store.getItem(STORAGE_KEYS.PENDING_MUTATIONS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Writes pending mutations queue.
   */
  private setPendingMutations(mutations: PendingMutation[]): void {
    this.store.setItem(STORAGE_KEYS.PENDING_MUTATIONS, JSON.stringify(mutations));
  }

  public clearPendingMutations(): void {
    this.store.removeItem(STORAGE_KEYS.PENDING_MUTATIONS);
  }

  private enqueueMutation(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>): void {
    const queue = this.getPendingMutations();
    queue.push({
      ...mutation,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    this.setPendingMutations(queue);
  }

  /**
   * Queries tasks with remote reconcile and seamless local fallback.
   */
  public async getTasks(): Promise<Task[]> {
    // 1. Get cached tasks (initialized with seed if empty)
    const cached = this.getCache();

    // 2. If forced offline or mock error, return cache directly
    if (!this.isOnline() || this.mockRemoteError) {
      return cached;
    }

    // 3. Attempt remote reconcile from Supabase
    try {
      const { data, error } = await supabase
        .from('homefix_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        // Table not yet created (PGRST205) or network failure: fall back cleanly
        return cached;
      }

      // Reconcile remote data with local cache using Last-Write-Wins (LWW)
      const mergedMap = new Map<string, Task>();
      for (const localTask of cached) {
        mergedMap.set(localTask.id, localTask);
      }

      for (const remoteRow of data) {
        const remoteTask: Task = {
          id: remoteRow.id,
          title: remoteRow.title,
          room: remoteRow.room,
          urgency: remoteRow.urgency,
          effort: remoteRow.effort,
          cost: remoteRow.cost !== null ? Number(remoteRow.cost) : null,
          execution_type: remoteRow.execution_type,
          status: remoteRow.status,
          created_at: remoteRow.created_at,
          updated_at: remoteRow.updated_at
        };

        const local = mergedMap.get(remoteTask.id);
        if (!local || (remoteTask.updated_at && local.updated_at && remoteTask.updated_at >= local.updated_at)) {
          mergedMap.set(remoteTask.id, remoteTask);
        }
      }

      const merged = Array.from(mergedMap.values());
      this.setCache(merged);
      return merged;
    } catch {
      // Remote call failure (e.g. network disconnect) -> return cached data
      return cached;
    }
  }

  /**
   * Creates a new task with immediate optimistic cache update and remote sync.
   */
  public async createTask(taskInput: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const validation = validateTask(taskInput);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskInput,
      id: generateUUID(),
      created_at: now,
      updated_at: now
    };

    // Optimistic cache update
    const current = this.getCache();
    const updated = [newTask, ...current];
    this.setCache(updated);

    // Sync or enqueue
    if (this.isOnline() && !this.mockRemoteError) {
      try {
        const { error } = await supabase.from('homefix_tasks').insert({
          id: newTask.id,
          title: newTask.title,
          room: newTask.room,
          urgency: newTask.urgency,
          effort: newTask.effort,
          cost: newTask.cost ?? null,
          execution_type: newTask.execution_type,
          status: newTask.status,
          created_at: newTask.created_at,
          updated_at: newTask.updated_at
        });

        if (error) {
          this.enqueueMutation({
            type: 'INSERT',
            taskId: newTask.id,
            payload: newTask
          });
        }
      } catch {
        this.enqueueMutation({
          type: 'INSERT',
          taskId: newTask.id,
          payload: newTask
        });
      }
    } else {
      this.enqueueMutation({
        type: 'INSERT',
        taskId: newTask.id,
        payload: newTask
      });
    }

    return newTask;
  }

  /**
   * Updates an existing task with optimistic cache update and remote sync.
   */
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

    const validation = validateTask(updatedTask);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    current[idx] = updatedTask;
    this.setCache(current);

    if (this.isOnline() && !this.mockRemoteError) {
      try {
        const payloadToUpdate: Record<string, any> = {
          updated_at: updatedTask.updated_at
        };
        if (updates.title !== undefined) payloadToUpdate.title = updates.title;
        if (updates.room !== undefined) payloadToUpdate.room = updates.room;
        if (updates.urgency !== undefined) payloadToUpdate.urgency = updates.urgency;
        if (updates.effort !== undefined) payloadToUpdate.effort = updates.effort;
        if (updates.cost !== undefined) payloadToUpdate.cost = updates.cost;
        if (updates.execution_type !== undefined) payloadToUpdate.execution_type = updates.execution_type;
        if (updates.status !== undefined) payloadToUpdate.status = updates.status;
        if (updates.payment_mode !== undefined) payloadToUpdate.payment_mode = updates.payment_mode;
        if (updates.installments_count !== undefined) payloadToUpdate.installments_count = updates.installments_count;
        if (updates.installment_amount !== undefined) payloadToUpdate.installment_amount = updates.installment_amount;
        if (updates.resolved_at !== undefined) payloadToUpdate.resolved_at = updates.resolved_at;
        if (updates.resolved_notes !== undefined) payloadToUpdate.resolved_notes = updates.resolved_notes;

        const { error } = await supabase
          .from('homefix_tasks')
          .update(payloadToUpdate)
          .eq('id', id);

        if (error) {
          this.enqueueMutation({
            type: 'UPDATE',
            taskId: id,
            payload: updates
          });
        }
      } catch {
        this.enqueueMutation({
          type: 'UPDATE',
          taskId: id,
          payload: updates
        });
      }
    } else {
      this.enqueueMutation({
        type: 'UPDATE',
        taskId: id,
        payload: updates
      });
    }

    return updatedTask;
  }

  /**
   * Toggles task status between 'pendiente' and 'listo'.
   */
  public async toggleTaskStatus(id: string): Promise<Task> {
    const current = this.getCache();
    const task = current.find(t => t.id === id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    const newStatus: TaskStatus = task.status === 'listo' ? 'pendiente' : 'listo';
    return this.updateTask(id, { status: newStatus });
  }

  /**
   * Deletes a task by id with optimistic cache removal and remote sync.
   */
  public async deleteTask(id: string): Promise<void> {
    const current = this.getCache();
    const updated = current.filter(t => t.id !== id);
    this.setCache(updated);

    if (this.isOnline() && !this.mockRemoteError) {
      try {
        const { error } = await supabase.from('homefix_tasks').delete().eq('id', id);
        if (error) {
          this.enqueueMutation({
            type: 'DELETE',
            taskId: id
          });
        }
      } catch {
        this.enqueueMutation({
          type: 'DELETE',
          taskId: id
        });
      }
    } else {
      this.enqueueMutation({
        type: 'DELETE',
        taskId: id
      });
    }
  }

  /**
   * Resets local storage and remote tasks back to initial seed data.
   */
  public async resetToSeed(): Promise<Task[]> {
    const initial = getSeedTasks();
    this.setCache(initial);
    this.clearPendingMutations();

    if (this.isOnline() && !this.mockRemoteError) {
      try {
        await supabase.from('homefix_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('homefix_tasks').insert(initial);
      } catch {
        // Fall back gracefully
      }
    }

    return initial;
  }

  /**
   * Drains the pending mutation queue against Supabase.
   */
  public async drainMutationQueue(): Promise<number> {
    if (!this.isOnline() || this.mockRemoteError) return 0;
    const queue = this.getPendingMutations();
    if (queue.length === 0) return 0;

    let drained = 0;
    const remaining: PendingMutation[] = [];

    for (const mutation of queue) {
      try {
        if (mutation.type === 'INSERT' && mutation.payload) {
          const { error } = await supabase.from('homefix_tasks').insert(mutation.payload);
          if (error) throw error;
        } else if (mutation.type === 'UPDATE' && mutation.payload) {
          const { error } = await supabase
            .from('homefix_tasks')
            .update(mutation.payload)
            .eq('id', mutation.taskId);
          if (error) throw error;
        } else if (mutation.type === 'DELETE') {
          const { error } = await supabase
            .from('homefix_tasks')
            .delete()
            .eq('id', mutation.taskId);
          if (error) throw error;
        }
        drained++;
      } catch {
        mutation.retryCount++;
        remaining.push(mutation);
      }
    }

    this.setPendingMutations(remaining);
    return drained;
  }
}

// Singleton storage service instance
export const storageService = new ResilientStorageCoordinator();

// Export convenience functions conforming to StorageService interface
export const getTasks = () => storageService.getTasks();
export const createTask = (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => storageService.createTask(task);
export const updateTask = (id: string, updates: Partial<Task>) => storageService.updateTask(id, updates);
export const deleteTask = (id: string) => storageService.deleteTask(id);
export const toggleTaskStatus = (id: string) => storageService.toggleTaskStatus(id);
export const resetToSeed = () => storageService.resetToSeed();
