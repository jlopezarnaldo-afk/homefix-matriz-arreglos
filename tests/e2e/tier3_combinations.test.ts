/**
 * HomeFix E2E Test Suite — Tier 3: Cross-Feature Combinations
 * 
 * Verifies combinatorial and pairwise interactions:
 * - Full 25-cell Urgency x Effort truth table
 * - ExecutionType x Effort correlations
 * - Status modifier effects across all priority tiers
 * - Multi-filter orthogonal intersections
 */

import { describe, test, expect, setTier } from './harness.ts';
import type {
  Task,
  ComputedTask,
  RoomId,
  ExecutionType,
  TaskStatus
} from './contracts.ts';
import {
  referenceCalculatePriority,
  referenceCalculateQuadrant,
  referenceCalculatePriorityScore,
  referenceEnrichTask
} from './contracts.ts';

setTier('Tier 3: Cross-Feature Combinations');

describe('C1: Complete 25-Cell Urgency x Effort Truth Table', () => {
  // Authoritative Truth Table from survey_report.md §2.3
  const TRUTH_TABLE = [
    { u: 5, e: 1, p: 'P2', q: 'Q2', score: 74.00 },
    { u: 5, e: 2, p: 'P2', q: 'Q2', score: 73.20 },
    { u: 5, e: 3, p: 'P1', q: 'Q1', score: 92.40 },
    { u: 5, e: 4, p: 'P1', q: 'Q1', score: 91.60 },
    { u: 5, e: 5, p: 'P1', q: 'Q1', score: 90.80 },

    { u: 4, e: 1, p: 'P2', q: 'Q2', score: 72.00 },
    { u: 4, e: 2, p: 'P2', q: 'Q2', score: 71.20 },
    { u: 4, e: 3, p: 'P1', q: 'Q1', score: 90.40 },
    { u: 4, e: 4, p: 'P1', q: 'Q1', score: 89.60 },
    { u: 4, e: 5, p: 'P1', q: 'Q1', score: 88.80 },

    { u: 3, e: 1, p: 'P2', q: 'Q2', score: 70.00 },
    { u: 3, e: 2, p: 'P2', q: 'Q2', score: 69.20 },
    { u: 3, e: 3, p: 'P3', q: 'Q3', score: 48.40 },
    { u: 3, e: 4, p: 'P3', q: 'Q3', score: 47.60 },
    { u: 3, e: 5, p: 'P3', q: 'Q3', score: 46.80 },

    { u: 2, e: 1, p: 'P4', q: 'Q4', score: 28.00 },
    { u: 2, e: 2, p: 'P4', q: 'Q4', score: 27.20 },
    { u: 2, e: 3, p: 'P3', q: 'Q3', score: 46.40 },
    { u: 2, e: 4, p: 'P3', q: 'Q3', score: 45.60 },
    { u: 2, e: 5, p: 'P3', q: 'Q3', score: 44.80 },

    { u: 1, e: 1, p: 'P4', q: 'Q4', score: 26.00 },
    { u: 1, e: 2, p: 'P4', q: 'Q4', score: 25.20 },
    { u: 1, e: 3, p: 'P3', q: 'Q3', score: 44.40 },
    { u: 1, e: 4, p: 'P3', q: 'Q3', score: 43.60 },
    { u: 1, e: 5, p: 'P3', q: 'Q3', score: 42.80 }
  ];

  for (const cell of TRUTH_TABLE) {
    test(`T3.1.${cell.u}.${cell.e} - Grid [Urg=${cell.u}, Eff=${cell.e}] -> Priority: ${cell.p}, Quadrant: ${cell.q}, Score: ${cell.score.toFixed(2)}`, () => {
      const priority = referenceCalculatePriority(cell.u, cell.e, 0);
      const quadrant = referenceCalculateQuadrant(cell.u, cell.e);
      const score = referenceCalculatePriorityScore(cell.u, cell.e, 0, 'pendiente');

      expect(priority).toBe(cell.p);
      expect(quadrant).toBe(cell.q);
      expect(score).toBeCloseTo(cell.score, 2);
    });
  }
});

describe('C2: ExecutionType x Effort Cross Combinations', () => {
  test('T3.2.1 - DIY with Low Effort (1-2) models immediate homeowner action', () => {
    const task: Task = {
      id: 'c2-1',
      title: 'Cambiar gomita de canilla',
      room: 'cocina',
      urgency: 4,
      effort: 1,
      execution_type: 'diy',
      status: 'pendiente'
    };
    const enriched = referenceEnrichTask(task);
    expect(enriched.priority).toBe('P2');
    expect(enriched.quadrant).toBe('Q2');
  });

  test('T3.2.2 - DIY with High Effort (3-5) models weekend self-renovation projects', () => {
    const task: Task = {
      id: 'c2-2',
      title: 'Pintar reja exterior completa',
      room: 'exterior',
      urgency: 2,
      effort: 4,
      execution_type: 'diy',
      status: 'pendiente'
    };
    const enriched = referenceEnrichTask(task);
    expect(enriched.priority).toBe('P3');
    expect(enriched.quadrant).toBe('Q3');
  });

  test('T3.2.3 - Professional with High Effort (4-5) and High Urgency models contractor emergencies', () => {
    const task: Task = {
      id: 'c2-3',
      title: 'Caño de gas perforado',
      room: 'cocina',
      urgency: 5,
      effort: 5,
      cost: 85000,
      execution_type: 'profesional',
      status: 'pendiente'
    };
    const enriched = referenceEnrichTask(task);
    expect(enriched.priority).toBe('P1');
    expect(enriched.quadrant).toBe('Q1');
  });

  test('T3.2.4 - Professional with Low Effort (1-2) models specialist quick checks (e.g. gas certificate)', () => {
    const task: Task = {
      id: 'c2-4',
      title: 'Firma de inspección de caldera',
      room: 'general',
      urgency: 3,
      effort: 1,
      cost: 25000,
      execution_type: 'profesional',
      status: 'pendiente'
    };
    const enriched = referenceEnrichTask(task);
    expect(enriched.priority).toBe('P2');
    expect(enriched.quadrant).toBe('Q2');
  });
});

describe('C3: Status Modifier Effects Across All Priority Tiers', () => {
  test('T3.3.1 - P1 Emergency completed reduces score from ~92 to ~18', () => {
    const active = referenceCalculatePriorityScore(5, 3, 0, 'pendiente');
    const done = referenceCalculatePriorityScore(5, 3, 0, 'listo');
    expect(active).toBe(92.40);
    expect(done).toBe(18.48);
  });

  test('T3.3.2 - P2 Quick Win completed reduces score from ~74 to ~14.8', () => {
    const active = referenceCalculatePriorityScore(5, 1, 0, 'pendiente');
    const done = referenceCalculatePriorityScore(5, 1, 0, 'listo');
    expect(active).toBe(74.00);
    expect(done).toBe(14.80);
  });

  test('T3.3.3 - P3 Planned Project completed reduces score from ~48.4 to ~9.68', () => {
    const active = referenceCalculatePriorityScore(3, 3, 0, 'pendiente');
    const done = referenceCalculatePriorityScore(3, 3, 0, 'listo');
    expect(active).toBe(48.40);
    expect(done).toBe(9.68);
  });

  test('T3.3.4 - P4 Postponable completed reduces score from ~28 to ~5.6', () => {
    const active = referenceCalculatePriorityScore(2, 1, 0, 'pendiente');
    const done = referenceCalculatePriorityScore(2, 1, 0, 'listo');
    expect(active).toBe(28.00);
    expect(done).toBe(5.60);
  });

  test('T3.3.5 - Status "en_proceso" retains full active priority score (no penalty applied)', () => {
    const pendingScore = referenceCalculatePriorityScore(4, 3, 0, 'pendiente');
    const inProcessScore = referenceCalculatePriorityScore(4, 3, 0, 'en_proceso');
    expect(inProcessScore).toBe(pendingScore);
  });
});

describe('C4: Multi-Filter Combinatorial Matrix Intersections', () => {
  const dataset: Task[] = [
    { id: '1', title: 'Canilla cocina', room: 'cocina', urgency: 5, effort: 2, execution_type: 'diy', status: 'pendiente' },
    { id: '2', title: 'Mesada cocina', room: 'cocina', urgency: 2, effort: 4, execution_type: 'profesional', status: 'en_proceso' },
    { id: '3', title: 'Ducha baño', room: 'baño', urgency: 4, effort: 2, execution_type: 'diy', status: 'pendiente' },
    { id: '4', title: 'Inodoro baño', room: 'baño', urgency: 3, effort: 3, execution_type: 'profesional', status: 'listo' },
    { id: '5', title: 'Lámpara living', room: 'living', urgency: 1, effort: 1, execution_type: 'diy', status: 'listo' }
  ];

  test('T3.4.1 - Intersecting Room=cocina + Exec=diy + Status=pendiente yields exact single match', () => {
    const result = dataset.filter(
      t => t.room === 'cocina' && t.execution_type === 'diy' && t.status === 'pendiente'
    );
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
  });

  test('T3.4.2 - Non-matching multi-filter combination returns empty array without throwing', () => {
    const result = dataset.filter(
      t => t.room === 'living' && t.execution_type === 'profesional' && t.status === 'en_proceso'
    );
    expect(result.length).toBe(0);
  });

  test('T3.4.3 - Partial filter: Room=baño returns all baño tasks regardless of status or execution', () => {
    const result = dataset.filter(t => t.room === 'baño');
    expect(result.length).toBe(2);
  });

  test('T3.4.4 - Status=listo + Search substring matches accurately across rooms', () => {
    const result = dataset.filter(
      t => t.status === 'listo' && t.title.toLowerCase().includes('inodoro')
    );
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Inodoro baño');
  });
});
