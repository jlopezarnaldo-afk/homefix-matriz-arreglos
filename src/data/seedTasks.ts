/**
 * HomeFix Seed Tasks Dataset
 * 
 * Representative initial tasks preloaded for new users.
 * Covers diverse rooms, urgency/effort levels, DIY vs Professional workflows,
 * realistic budgets in ARS, and all 4 matrix quadrants.
 */

import type { Task } from '../types/task';

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
 * Returns a fresh, deep copy of the seed tasks.
 */
export function getSeedTasks(): Task[] {
  return SEED_TASKS.map(task => ({ ...task }));
}
