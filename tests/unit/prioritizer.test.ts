/**
 * Unit Tests for HomeFix Prioritizer Service
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePriority,
  calculateQuadrant,
  calculatePriorityScore,
  enrichTask
} from '../../src/services/prioritizer';
import { HIGH_COST_THRESHOLD, type Task } from '../../src/types/task';

describe('Prioritizer Service — calculatePriority', () => {
  describe('Acceptance Criteria: Urgency >= 4', () => {
    it('classifies Urgency >= 4 with low effort (1-2) as P2 (Quick Win)', () => {
      expect(calculatePriority(4, 1)).toBe('P2');
      expect(calculatePriority(4, 2)).toBe('P2');
      expect(calculatePriority(5, 1)).toBe('P2');
      expect(calculatePriority(5, 2)).toBe('P2');
    });

    it('classifies Urgency >= 4 with high effort (3-5) as P1 (Emergencia)', () => {
      expect(calculatePriority(4, 3)).toBe('P1');
      expect(calculatePriority(4, 4)).toBe('P1');
      expect(calculatePriority(4, 5)).toBe('P1');
      expect(calculatePriority(5, 3)).toBe('P1');
      expect(calculatePriority(5, 4)).toBe('P1');
      expect(calculatePriority(5, 5)).toBe('P1');
    });
  });

  describe('Urgency == 3 (Moderate)', () => {
    it('classifies Urgency == 3 with low effort (1-2) as P2 (Quick Win)', () => {
      expect(calculatePriority(3, 1)).toBe('P2');
      expect(calculatePriority(3, 2)).toBe('P2');
    });

    it('classifies Urgency == 3 with high effort (3-5) as P3 (Proyecto Planificado)', () => {
      expect(calculatePriority(3, 3)).toBe('P3');
      expect(calculatePriority(3, 4)).toBe('P3');
      expect(calculatePriority(3, 5)).toBe('P3');
    });
  });

  describe('Urgency <= 2 (Low)', () => {
    it('classifies Urgency <= 2 with low effort (1-2) and low cost as P4 (Postergable)', () => {
      expect(calculatePriority(1, 1, 0)).toBe('P4');
      expect(calculatePriority(1, 2, 10000)).toBe('P4');
      expect(calculatePriority(2, 1, 49999)).toBe('P4');
      expect(calculatePriority(2, 2, null)).toBe('P4');
    });

    it('promotes Urgency <= 2 with low effort to P3 if cost >= 50,000 ARS', () => {
      expect(calculatePriority(1, 1, 50000)).toBe('P3');
      expect(calculatePriority(2, 2, 75000)).toBe('P3');
      expect(calculatePriority(2, 1, HIGH_COST_THRESHOLD)).toBe('P3');
    });

    it('classifies Urgency <= 2 with high effort (3-5) as P3 (Proyecto Planificado)', () => {
      expect(calculatePriority(2, 3, 0)).toBe('P3');
      expect(calculatePriority(2, 4, 1000)).toBe('P3');
      expect(calculatePriority(2, 5, null)).toBe('P3');
      expect(calculatePriority(1, 3, 0)).toBe('P3');
      expect(calculatePriority(1, 4, 0)).toBe('P3');
      expect(calculatePriority(1, 5, 0)).toBe('P3');
    });
  });
});

describe('Prioritizer Service — calculateQuadrant', () => {
  it('maps Urgency >= 4, Effort >= 3 to Q1 (Emergencias)', () => {
    expect(calculateQuadrant(5, 5)).toBe('Q1');
    expect(calculateQuadrant(5, 3)).toBe('Q1');
    expect(calculateQuadrant(4, 4)).toBe('Q1');
    expect(calculateQuadrant(4, 3)).toBe('Q1');
  });

  it('maps Urgency >= 3, Effort <= 2 to Q2 (Victorias Rápidas)', () => {
    expect(calculateQuadrant(5, 1)).toBe('Q2');
    expect(calculateQuadrant(5, 2)).toBe('Q2');
    expect(calculateQuadrant(4, 1)).toBe('Q2');
    expect(calculateQuadrant(4, 2)).toBe('Q2');
    expect(calculateQuadrant(3, 1)).toBe('Q2');
    expect(calculateQuadrant(3, 2)).toBe('Q2');
  });

  it('maps Urgency <= 3, Effort >= 3 to Q3 (Proyectos a Planificar)', () => {
    expect(calculateQuadrant(3, 3)).toBe('Q3');
    expect(calculateQuadrant(2, 3)).toBe('Q3');
    expect(calculateQuadrant(1, 4)).toBe('Q3');
    expect(calculateQuadrant(1, 5)).toBe('Q3');
  });

  it('promotes low effort tasks to Q3 if cost >= 50,000 ARS', () => {
    expect(calculateQuadrant(2, 1, 60000)).toBe('Q3');
    expect(calculateQuadrant(1, 2, 50000)).toBe('Q3');
  });

  it('maps Urgency <= 2, Effort <= 2 with low cost to Q4 (Tareas Menores)', () => {
    expect(calculateQuadrant(2, 1, 0)).toBe('Q4');
    expect(calculateQuadrant(2, 2, 20000)).toBe('Q4');
    expect(calculateQuadrant(1, 1, null)).toBe('Q4');
    expect(calculateQuadrant(1, 2, 0)).toBe('Q4');
  });
});

describe('Prioritizer Service — calculatePriorityScore', () => {
  it('returns scores strictly within [0.00, 100.00]', () => {
    for (let u = 1; u <= 5; u++) {
      for (let e = 1; e <= 5; e++) {
        for (const status of ['pendiente', 'en_proceso', 'listo'] as const) {
          const score = calculatePriorityScore(u, e, 25000, status);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('maintains strict tier hierarchy for active tasks (P1 > P2 > P3 > P4)', () => {
    const p1Score = calculatePriorityScore(5, 3, 0, 'pendiente'); // P1
    const p2Score = calculatePriorityScore(5, 1, 0, 'pendiente'); // P2
    const p3Score = calculatePriorityScore(3, 3, 0, 'pendiente'); // P3
    const p4Score = calculatePriorityScore(2, 1, 0, 'pendiente'); // P4

    expect(p1Score).toBeGreaterThan(p2Score);
    expect(p2Score).toBeGreaterThan(p3Score);
    expect(p3Score).toBeGreaterThan(p4Score);
  });

  it('attenuates score by 0.2 (80% reduction) when status is "listo"', () => {
    const activeScore = calculatePriorityScore(4, 2, 10000, 'pendiente');
    const completedScore = calculatePriorityScore(4, 2, 10000, 'listo');

    expect(completedScore).toBeCloseTo(Number((activeScore * 0.2).toFixed(2)), 2);
    expect(completedScore).toBeLessThan(activeScore);
  });

  it('awards extra points for lower effort within the same priority tier', () => {
    const lowEffort = calculatePriorityScore(4, 1, 0, 'pendiente');
    const highEffort = calculatePriorityScore(4, 2, 0, 'pendiente');
    expect(lowEffort).toBeGreaterThan(highEffort);
  });

  it('awards cost bonus up to max 10 points (2.0 normalized) for high cost', () => {
    const noCost = calculatePriorityScore(3, 3, 0, 'pendiente');
    const highCost = calculatePriorityScore(3, 3, 100000, 'pendiente');
    expect(highCost).toBeGreaterThan(noCost);
    expect(highCost - noCost).toBeCloseTo(2.0, 1);
  });
});

describe('Prioritizer Service — enrichTask', () => {
  const sampleTask: Task = {
    id: 'test-123',
    title: 'Reparación de cerradura',
    room: 'general',
    urgency: 4,
    effort: 2,
    cost: 5000,
    execution_type: 'diy',
    status: 'pendiente'
  };

  it('attaches computed priority, quadrant, and score properties', () => {
    const enriched = enrichTask(sampleTask);

    expect(enriched.id).toBe(sampleTask.id);
    expect(enriched.priority).toBe('P2');
    expect(enriched.quadrant).toBe('Q2');
    expect(enriched.priority_score).toBe(71.40);
    expect(enriched.priorityScore).toBe(71.40);
    expect(enriched.priority_label).toBe('P2 - Quick Win');
    expect(enriched.quadrant_title).toBe('Q2 — Victorias Rápidas (Quick Wins)');
  });

  it('does not mutate the source task object', () => {
    const copy = { ...sampleTask };
    enrichTask(sampleTask);
    expect(sampleTask).toEqual(copy);
  });
});
