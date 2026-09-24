/**
 * HomeFix Prioritization Engine & Mathematical Ranking Logic
 * 
 * Provides categorical priority classification (P1..P4),
 * 2x2 matrix quadrant mapping (Q1..Q4), continuous ranking score (0-100),
 * and task enrichment.
 */

import {
  HIGH_COST_THRESHOLD,
  PRIORITY_LABELS,
  QUADRANT_TITLES,
  type ComputedTask,
  type PriorityLevel,
  type QuadrantId,
  type Task,
  type TaskStatus
} from '../types/task';

/**
 * Calculates categorical priority level (P1, P2, P3, P4) based on urgency, effort, and cost.
 * 
 * Rules:
 * - Low effort (<= 2):
 *   - Urgency >= 3 (3, 4, 5) -> P2 (Quick Win)
 *     [Acceptance Criteria: Urg >= 4 + low effort is P2]
 *   - Urgency <= 2:
 *     - If cost >= 50,000 -> P3 (Proyecto Planificado)
 *     - Else -> P4 (Postergable)
 * - High effort (>= 3):
 *   - Urgency >= 4 (4, 5) -> P1 (Emergencia / Crítico)
 *   - Urgency <= 3 (1, 2, 3) -> P3 (Proyecto Planificado)
 */
export function calculatePriority(
  urgency: number,
  effort: number,
  cost: number | null = 0
): PriorityLevel {
  // Low effort: effort 1 or 2
  if (effort <= 2) {
    if (urgency >= 3) {
      return 'P2';
    }
    if (cost !== null && cost !== undefined && cost >= HIGH_COST_THRESHOLD) {
      return 'P3';
    }
    return 'P4';
  }

  // High effort: effort 3, 4, or 5
  if (urgency >= 4) {
    return 'P1';
  }
  return 'P3';
}

/**
 * Calculates 2x2 matrix quadrant (Q1, Q2, Q3, Q4).
 * 
 * - Q1: Emergencias (Alta Urgencia >= 4, Alto Esfuerzo >= 3)
 * - Q2: Victorias Rápidas (Alta/Media Urgencia >= 3, Bajo Esfuerzo <= 2)
 * - Q3: Proyectos a Planificar (Baja Urgencia <= 3 con Alto Esfuerzo, o Costo >= $50,000)
 * - Q4: Tareas Menores / Postergables (Baja Urgencia <= 2, Bajo Esfuerzo <= 2)
 */
export function calculateQuadrant(
  urgency: number,
  effort: number,
  cost: number | null = 0
): QuadrantId {
  if (effort <= 2) {
    if (urgency >= 3) {
      return 'Q2';
    }
    if (cost !== null && cost !== undefined && cost >= HIGH_COST_THRESHOLD) {
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

/**
 * Calculates continuous priority score S in [0.00, 100.00] for deterministic sorting.
 * 
 * Formula:
 *   S = ((BaseTier + 10*urgency + 4*(6-effort) + CostBonus) / 5) * StatusModifier
 * 
 * - BaseTier: P1=400, P2=300, P3=200, P4=100
 * - Urgency Points: urgency * 10 (10 to 50)
 * - Inverted Effort: (6 - effort) * 4 (4 to 20)
 * - CostBonus: min(10, round(cost / 10000)) (0 to 10)
 * - StatusModifier: 1.0 for active, 0.2 for 'listo'
 */
export function calculatePriorityScore(
  urgency: number,
  effort: number,
  cost: number | null = 0,
  status: TaskStatus = 'pendiente'
): number {
  const priority = calculatePriority(urgency, effort, cost);

  const TIER_BASE: Record<PriorityLevel, number> = {
    P1: 400,
    P2: 300,
    P3: 200,
    P4: 100
  };

  const baseTier = TIER_BASE[priority];
  const urgencyPoints = urgency * 10;
  const invertedEffort = (6 - effort) * 4;
  const numericCost = cost !== null && cost !== undefined ? Number(cost) : 0;
  const costBonus = Math.min(10, Math.round(numericCost / 10000));

  let score = (baseTier + urgencyPoints + invertedEffort + costBonus) / 5;

  if (status === 'listo') {
    score = score * 0.2; // Attenuated by 0.2 for completed tasks
  }

  return Number(score.toFixed(2));
}

/**
 * Enriches a Task with calculated priority, quadrant, continuous score, and readable labels.
 */
export function enrichTask(task: Task): ComputedTask {
  const priority = calculatePriority(task.urgency, task.effort, task.cost);
  const quadrant = calculateQuadrant(task.urgency, task.effort, task.cost);
  const priority_score = calculatePriorityScore(task.urgency, task.effort, task.cost, task.status);
  const priority_label = PRIORITY_LABELS[priority];
  const quadrant_title = QUADRANT_TITLES[quadrant];

  return {
    ...task,
    priority,
    quadrant,
    priority_score,
    priority_label,
    quadrant_title,
    priorityScore: priority_score,
    priorityLabel: priority_label,
    quadrantTitle: quadrant_title
  };
}
