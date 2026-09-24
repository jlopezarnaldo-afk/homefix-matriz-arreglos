/**
 * HomeFix Resilient Storage Service & Offline Sync Coordinator
 * 
 * Provides an offline-first data layer with transparent fallback to localStorage,
 * optimistic UI mutations, and a pending mutation queue for eventual consistency.
 */

import { getSeedTasks } from '../data/seedTasks';
import { validateTask, type Task, type TaskStatus } from '../types/task';
import { supabase, ensureSupabaseAuth } from './supabase';

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
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }

    // Check backup keys to rescue any existing user tasks
    const backupKeys = ['homefix_permanent_tasks', 'homefix_tasks', 'homefix_tasks_backup'];
    for (const key of backupKeys) {
      const backupRaw = this.store.getItem(key);
      if (backupRaw) {
        try {
          const parsed = JSON.parse(backupRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.setCache(parsed);
            return parsed;
          }
        } catch {}
      }
    }

    // If completely clear (null) or corrupted or non-array, bootstrap with seed tasks
    const initial = getSeedTasks();
    this.setCache(initial);
    return initial;
  }

  /**
   * Persists tasks array into local cache.
   */
  public setCache(tasks: Task[]): void {
    const serialized = JSON.stringify(tasks);
    this.store.setItem(STORAGE_KEYS.TASKS_CACHE, serialized);
    this.store.setItem('homefix_permanent_tasks', serialized);
    this.store.setItem('homefix_initialized', 'true');
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

  private async syncTasksToOrders(tasks: Task[]): Promise<void> {
    try {
      await ensureSupabaseAuth();
      for (const t of tasks) {
        await supabase.from('orders').insert({
          id: t.id,
          workshop_id: 'mk4',
          client_name: t.title,
          client_phone: 'HOMEFIX',
          vehicle_brand: 'HomeFix',
          vehicle_model: t.room || 'general',
          reported_issue: JSON.stringify(t),
          status: t.status,
          final_budget: t.cost ?? 0,
          items: [t]
        });
      }
    } catch {}
  }

  /**
   * Queries tasks with remote reconcile and seamless local fallback.
   */
  public async getTasks(): Promise<Task[]> {
    // 1. Get cached tasks
    const cached = this.getCache();

    // 2. If forced offline or mock error, return cache directly
    if (!this.isOnline() || this.mockRemoteError) {
      return cached;
    }

    // 3. Attempt remote reconcile from Supabase
    try {
      await ensureSupabaseAuth();

      // Attempt live orders table (with safe chained method check for Vitest mocks)
      let ordersData: any[] | null = null;
      let ordersErr: any = null;

      try {
        const query = supabase.from('orders').select('*');
        if (typeof (query as any)?.eq === 'function') {
          const filtered = (query as any).eq('workshop_id', 'mk4').eq('client_phone', 'HOMEFIX');
          if (typeof (filtered as any)?.order === 'function') {
            const res = await (filtered as any).order('created_at', { ascending: false });
            ordersData = res?.data;
            ordersErr = res?.error;
          }
        }
      } catch (e) {
        ordersErr = e;
      }

      if (!ordersErr && Array.isArray(ordersData)) {
        if (ordersData.length > 0) {
          const remoteTasks: Task[] = [];
          for (const row of ordersData) {
            try {
              if (row.reported_issue) {
                const parsed = JSON.parse(row.reported_issue);
                remoteTasks.push({
                  ...parsed,
                  id: row.id,
                  title: parsed.title || row.client_name,
                  cost: row.final_budget !== null && row.final_budget !== undefined ? Number(row.final_budget) : parsed.cost,
                  status: (row.status as TaskStatus) || parsed.status,
                  created_at: row.created_at || parsed.created_at,
                  updated_at: row.updated_at || parsed.updated_at
                });
              }
            } catch {
              remoteTasks.push({
                id: row.id,
                title: row.client_name,
                room: (row.vehicle_model as any) || 'general',
                urgency: 3,
                effort: 2,
                cost: row.final_budget !== null ? Number(row.final_budget) : null,
                execution_type: 'diy',
                status: (row.status as TaskStatus) || 'pendiente',
                created_at: row.created_at,
                updated_at: row.updated_at
              });
            }
          }
          this.setCache(remoteTasks);
          return remoteTasks;
        } else {
          // If remote orders is currently empty, push existing cached tasks to cloud so they aren't lost
          if (cached.length > 0) {
            this.syncTasksToOrders(cached).catch(() => {});
            return cached;
          }
        }
      }

      // Fallback to homefix_tasks table (supports unit test mocks and native table)
      const hfQuery = supabase.from('homefix_tasks').select('*');
      const { data, error } = typeof (hfQuery as any)?.order === 'function'
        ? await (hfQuery as any).order('created_at', { ascending: false })
        : await hfQuery;

      if (error || !data) {
        return cached;
      }

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
          payment_mode: remoteRow.payment_mode || null,
          installments_count: remoteRow.installments_count || null,
          installment_amount: remoteRow.installment_amount !== null ? Number(remoteRow.installment_amount) : null,
          resolved_at: remoteRow.resolved_at || null,
          resolved_notes: remoteRow.resolved_notes || null,
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

    // Sync to Supabase
    if (this.isOnline() && !this.mockRemoteError) {
      let syncSucceeded = false;
      try {
        await ensureSupabaseAuth();
        // 1. Try orders table
        try {
          const { error } = await supabase.from('orders').insert({
            id: newTask.id,
            workshop_id: 'mk4',
            client_name: newTask.title,
            client_phone: 'HOMEFIX',
            vehicle_brand: 'HomeFix',
            vehicle_model: newTask.room || 'general',
            reported_issue: JSON.stringify(newTask),
            status: newTask.status,
            final_budget: newTask.cost ?? 0,
            items: [newTask]
          });
          if (!error) syncSucceeded = true;
        } catch {}

        if (!syncSucceeded) {
          // 2. Try homefix_tasks table
          const { error: hfError } = await supabase.from('homefix_tasks').insert({
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
          if (!hfError) syncSucceeded = true;
        }
      } catch {}

      if (!syncSucceeded) {
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
      let syncSucceeded = false;
      try {
        await ensureSupabaseAuth();
        // 1. Try orders table
        try {
          const { error } = await supabase
            .from('orders')
            .update({
              client_name: updatedTask.title,
              vehicle_model: updatedTask.room || 'general',
              reported_issue: JSON.stringify(updatedTask),
              status: updatedTask.status,
              final_budget: updatedTask.cost ?? 0,
              updated_at: updatedTask.updated_at,
              items: [updatedTask]
            })
            .eq('id', id);
          if (!error) syncSucceeded = true;
        } catch {}

        if (!syncSucceeded) {
          // 2. Try homefix_tasks table
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

          const { error: hfError } = await supabase
            .from('homefix_tasks')
            .update(payloadToUpdate)
            .eq('id', id);

          if (!hfError) syncSucceeded = true;
        }
      } catch {}

      if (!syncSucceeded) {
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
      let syncSucceeded = false;
      try {
        await ensureSupabaseAuth();
        // 1. Try orders table
        try {
          const { error } = await supabase.from('orders').delete().eq('id', id);
          if (!error) syncSucceeded = true;
        } catch {}

        if (!syncSucceeded) {
          // 2. Try homefix_tasks table
          const { error: hfError } = await supabase.from('homefix_tasks').delete().eq('id', id);
          if (!hfError) syncSucceeded = true;
        }
      } catch {}

      if (!syncSucceeded) {
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
        await ensureSupabaseAuth();
        let synced = false;

        if (mutation.type === 'INSERT' && mutation.payload) {
          try {
            const { error } = await supabase.from('orders').insert({
              id: mutation.taskId,
              workshop_id: 'mk4',
              client_name: (mutation.payload as any).title,
              client_phone: 'HOMEFIX',
              vehicle_brand: 'HomeFix',
              vehicle_model: (mutation.payload as any).room || 'general',
              reported_issue: JSON.stringify(mutation.payload),
              status: (mutation.payload as any).status,
              final_budget: (mutation.payload as any).cost ?? 0,
              items: [mutation.payload]
            });
            if (!error) synced = true;
          } catch {}

          if (!synced) {
            const { error } = await supabase.from('homefix_tasks').insert(mutation.payload);
            if (error) throw error;
            synced = true;
          }
        } else if (mutation.type === 'UPDATE' && mutation.payload) {
          try {
            const { error } = await supabase
              .from('orders')
              .update({
                client_name: (mutation.payload as any).title,
                reported_issue: JSON.stringify(mutation.payload),
                status: (mutation.payload as any).status,
                final_budget: (mutation.payload as any).cost ?? 0
              })
              .eq('id', mutation.taskId);
            if (!error) synced = true;
          } catch {}

          if (!synced) {
            const { error } = await supabase
              .from('homefix_tasks')
              .update(mutation.payload)
              .eq('id', mutation.taskId);
            if (error) throw error;
            synced = true;
          }
        } else if (mutation.type === 'DELETE') {
          try {
            const { error } = await supabase
              .from('orders')
              .delete()
              .eq('id', mutation.taskId);
            if (!error) synced = true;
          } catch {}

          if (!synced) {
            const { error } = await supabase
              .from('homefix_tasks')
              .delete()
              .eq('id', mutation.taskId);
            if (error) throw error;
            synced = true;
          }
        }

        if (synced) {
          drained++;
        } else {
          mutation.retryCount++;
          remaining.push(mutation);
        }
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
