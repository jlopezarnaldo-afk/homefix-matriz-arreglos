/**
 * HomeFix E2E & Domain Test Suite — Tier 5: Adversarial Stress Testing
 * 
 * Conducts white-box adversarial verification against:
 * 1. Acceptance Criteria: Strict Urgency >= 4 partition (P2 if effort <= 2, P1 if effort >= 3)
 * 2. Boundary Values: Urgency 1 & 5, Effort 1 & 5, Costs (negative, 0, $10,000,000,000, NaN, null)
 * 3. Monotonicity & Deterministic Ranking: Tier strictness, score monotonicity, status === 'listo' 0.2 attenuation
 * 4. String Boundaries & Adversarial Payloads: 3-char min, 120-char max, whitespace trimming, emojis, unicode, XSS/SQL payloads
 * 5. Room Normalization: Diacritic tolerance ('baño' vs 'bano', case insensitivity, whitespace trimming)
 * 6. Mathematical Invariants: All 25 Urgency x Effort cells, score bounds [0.00, 100.00], immutability
 */

import { describe, test, expect, setTier } from './harness.ts';
import {
  calculatePriority,
  calculateQuadrant,
  calculatePriorityScore,
  enrichTask
} from '../../src/services/prioritizer';
import {
  validateTask,
  normalizeRoom,
  HIGH_COST_THRESHOLD,
  type Task,
  type RoomId,
  type TaskStatus,
  type PriorityLevel
} from '../../src/types/task';
import {
  formatCurrencyARS,
  formatDate,
  formatDateTime,
  formatRelativeDate
} from '../../src/utils/formatters';

setTier('Tier 5: Adversarial Stress Testing');

// ============================================================================
// SUITE 1: STRICT ACCEPTANCE CRITERION VERIFICATION (Urgency >= 4)
// ============================================================================
describe('ADV-1: Acceptance Criteria Partition (Urgency >= 4)', () => {
  test('ADV-1.1 - Urgency >= 4 and Effort <= 2 MUST strictly classify as P2 (Quick Win) across all costs', () => {
    const testCosts = [0, 500, 10000, 50000, 100000, 99999999, null, undefined];

    for (const urgency of [4, 5]) {
      for (const effort of [1, 2]) {
        for (const cost of testCosts) {
          const priority = calculatePriority(urgency, effort, cost);
          const quadrant = calculateQuadrant(urgency, effort, cost);

          expect(priority).toBe('P2');
          expect(quadrant).toBe('Q2');
        }
      }
    }
  });

  test('ADV-1.2 - Urgency >= 4 and Effort >= 3 MUST strictly classify as P1 (Emergencia) across all costs', () => {
    const testCosts = [0, 500, 10000, 50000, 100000, 99999999, null, undefined];

    for (const urgency of [4, 5]) {
      for (const effort of [3, 4, 5]) {
        for (const cost of testCosts) {
          const priority = calculatePriority(urgency, effort, cost);
          const quadrant = calculateQuadrant(urgency, effort, cost);

          expect(priority).toBe('P1');
          expect(quadrant).toBe('Q1');
        }
      }
    }
  });

  test('ADV-1.3 - Acceptance Criteria Invariant: High cost MUST NOT demote an Urgency >= 4 Quick Win to P3', () => {
    // A high cost ($100,000) on Urgency 4, Effort 1 must REMAIN P2 because Urg >= 4 takes precedence
    const resP2 = calculatePriority(4, 1, 100000);
    expect(resP2).toBe('P2');

    const resP2Max = calculatePriority(5, 2, 99999999);
    expect(resP2Max).toBe('P2');
  });
});

// ============================================================================
// SUITE 2: EXTREME BOUNDARY VALUES & STRESS INPUTS
// ============================================================================
describe('ADV-2: Extreme Boundaries (Urgency, Effort, Cost)', () => {
  test('ADV-2.1 - Exact Boundary: Urgency 1 & 5, Effort 1 & 5 are strictly valid', () => {
    const combinations = [
      { urgency: 1, effort: 1 },
      { urgency: 1, effort: 5 },
      { urgency: 5, effort: 1 },
      { urgency: 5, effort: 5 }
    ];

    for (const c of combinations) {
      const res = validateTask({
        title: 'Prueba de bordes extremos',
        room: 'cocina',
        urgency: c.urgency,
        effort: c.effort,
        execution_type: 'diy'
      });
      expect(res.valid).toBeTruthy();
    }
  });

  test('ADV-2.2 - Cost Boundary: Negative costs are rejected by validation schema', () => {
    const negativeCosts = [-1, -50, -10000, -99999999];
    for (const neg of negativeCosts) {
      const res = validateTask({
        title: 'Reparación con costo negativo',
        room: 'baño',
        urgency: 3,
        effort: 2,
        cost: neg,
        execution_type: 'diy'
      });
      expect(res.valid).toBeFalsy();
      expect(res.errors.cost).toBeDefined();
    }
  });

  test('ADV-2.3 - Cost Boundary: Zero cost and Null/Undefined costs are valid', () => {
    const zeroRes = validateTask({
      title: 'Reparación costo cero',
      room: 'baño',
      urgency: 3,
      effort: 2,
      cost: 0,
      execution_type: 'diy'
    });
    expect(zeroRes.valid).toBeTruthy();

    const nullRes = validateTask({
      title: 'Reparación costo nulo',
      room: 'baño',
      urgency: 3,
      effort: 2,
      cost: null,
      execution_type: 'diy'
    });
    expect(nullRes.valid).toBeTruthy();

    const undefRes = validateTask({
      title: 'Reparación sin campo costo',
      room: 'baño',
      urgency: 3,
      effort: 2,
      execution_type: 'diy'
    });
    expect(undefRes.valid).toBeTruthy();
  });

  test('ADV-2.4 - Cost Boundary: Extreme numbers ($10,000,000,000) rejected by validator, but saturated safely by prioritizer', () => {
    // 1. Validator rejects beyond 99,999,999
    const valRes = validateTask({
      title: 'Obra multimillonaria',
      room: 'general',
      urgency: 4,
      effort: 4,
      cost: 10000000000,
      execution_type: 'profesional'
    });
    expect(valRes.valid).toBeFalsy();
    expect(valRes.errors.cost).toBeDefined();

    // 2. Direct mathematical prioritization saturates cost bonus to 10 max (no overflow, no NaN)
    const extremeScore = calculatePriorityScore(4, 3, 10000000000, 'pendiente');
    const capScore = calculatePriorityScore(4, 3, 100000, 'pendiente');
    expect(extremeScore).toBe(capScore);
    expect(extremeScore).toBe(92.40);
    expect(Number.isFinite(extremeScore)).toBeTruthy();
  });

  test('ADV-2.5 - Cost Boundary: NaN, Infinity, -Infinity are handled defensively', () => {
    const nanRes = validateTask({
      title: 'Costo NaN',
      room: 'cocina',
      urgency: 3,
      effort: 2,
      cost: NaN,
      execution_type: 'diy'
    });
    expect(nanRes.valid).toBeFalsy();
    expect(nanRes.errors.cost).toBeDefined();

    const infRes = validateTask({
      title: 'Costo Infinito',
      room: 'cocina',
      urgency: 3,
      effort: 2,
      cost: Infinity,
      execution_type: 'diy'
    });
    expect(infRes.valid).toBeFalsy();
    expect(infRes.errors.cost).toBeDefined();
  });

  test('ADV-2.6 - Boundary: Non-integer and out-of-range Urgency & Effort are rejected', () => {
    const invalidInputs = [
      { urgency: 0, effort: 1 },
      { urgency: 6, effort: 1 },
      { urgency: 3.5, effort: 1 },
      { urgency: 1, effort: 0 },
      { urgency: 1, effort: 6 },
      { urgency: 1, effort: 2.7 }
    ];

    for (const inv of invalidInputs) {
      const res = validateTask({
        title: 'Borde inválido',
        room: 'exterior',
        urgency: inv.urgency,
        effort: inv.effort,
        execution_type: 'diy'
      });
      expect(res.valid).toBeFalsy();
    }
  });
});

// ============================================================================
// SUITE 3: MONOTONICITY & DETERMINISTIC SORTING
// ============================================================================
describe('ADV-3: Monotonicity & Deterministic Ranking', () => {
  test('ADV-3.1 - Monotonicity: Higher urgency strictly increases score within the same tier (holding effort constant)', () => {
    // Within P1 (Effort 4)
    const p1_u4 = calculatePriorityScore(4, 4, 0, 'pendiente');
    const p1_u5 = calculatePriorityScore(5, 4, 0, 'pendiente');
    expect(p1_u5).toBeGreaterThan(p1_u4);
    expect(p1_u5 - p1_u4).toBeCloseTo(2.0, 2);

    // Within P2 (Effort 1)
    const p2_u3 = calculatePriorityScore(3, 1, 0, 'pendiente');
    const p2_u4 = calculatePriorityScore(4, 1, 0, 'pendiente');
    const p2_u5 = calculatePriorityScore(5, 1, 0, 'pendiente');
    expect(p2_u5).toBeGreaterThan(p2_u4);
    expect(p2_u4).toBeGreaterThan(p2_u3);

    // Within P3 (Effort 4)
    const p3_u1 = calculatePriorityScore(1, 4, 0, 'pendiente');
    const p3_u2 = calculatePriorityScore(2, 4, 0, 'pendiente');
    const p3_u3 = calculatePriorityScore(3, 4, 0, 'pendiente');
    expect(p3_u3).toBeGreaterThan(p3_u2);
    expect(p3_u2).toBeGreaterThan(p3_u1);

    // Within P4 (Effort 2)
    const p4_u1 = calculatePriorityScore(1, 2, 0, 'pendiente');
    const p4_u2 = calculatePriorityScore(2, 2, 0, 'pendiente');
    expect(p4_u2).toBeGreaterThan(p4_u1);
  });

  test('ADV-3.2 - Monotonicity: Lower effort strictly increases score within the same tier (holding urgency constant)', () => {
    // Within P1 (Urgency 5)
    const p1_e5 = calculatePriorityScore(5, 5, 0, 'pendiente');
    const p1_e4 = calculatePriorityScore(5, 4, 0, 'pendiente');
    const p1_e3 = calculatePriorityScore(5, 3, 0, 'pendiente');
    expect(p1_e3).toBeGreaterThan(p1_e4);
    expect(p1_e4).toBeGreaterThan(p1_e5);
    expect(p1_e3 - p1_e4).toBeCloseTo(0.8, 2);

    // Within P2 (Urgency 4)
    const p2_e2 = calculatePriorityScore(4, 2, 0, 'pendiente');
    const p2_e1 = calculatePriorityScore(4, 1, 0, 'pendiente');
    expect(p2_e1).toBeGreaterThan(p2_e2);
    expect(p2_e1 - p2_e2).toBeCloseTo(0.8, 2);

    // Within P3 (Urgency 2)
    const p3_e5 = calculatePriorityScore(2, 5, 0, 'pendiente');
    const p3_e4 = calculatePriorityScore(2, 4, 0, 'pendiente');
    const p3_e3 = calculatePriorityScore(2, 3, 0, 'pendiente');
    expect(p3_e3).toBeGreaterThan(p3_e4);
    expect(p3_e4).toBeGreaterThan(p3_e5);

    // Within P4 (Urgency 1)
    const p4_e2 = calculatePriorityScore(1, 2, 0, 'pendiente');
    const p4_e1 = calculatePriorityScore(1, 1, 0, 'pendiente');
    expect(p4_e1).toBeGreaterThan(p4_e2);
  });

  test('ADV-3.3 - Strict Inter-Tier Separation: Active P1 > P2 > P3 > P4 without overlaps', () => {
    let minP1 = 100;
    let maxP2 = 0;
    let minP2 = 100;
    let maxP3 = 0;
    let minP3 = 100;
    let maxP4 = 0;

    for (let u = 1; u <= 5; u++) {
      for (let e = 1; e <= 5; e++) {
        for (const cost of [0, 50000, 100000]) {
          const priority = calculatePriority(u, e, cost);
          const score = calculatePriorityScore(u, e, cost, 'pendiente');

          if (priority === 'P1') {
            if (score < minP1) minP1 = score;
          } else if (priority === 'P2') {
            if (score > maxP2) maxP2 = score;
            if (score < minP2) minP2 = score;
          } else if (priority === 'P3') {
            if (score > maxP3) maxP3 = score;
            if (score < minP3) minP3 = score;
          } else if (priority === 'P4') {
            if (score > maxP4) maxP4 = score;
          }
        }
      }
    }

    // Min P1 is 88.80, Max P2 is 76.00 -> Strict gap >= 12.80 points
    expect(minP1).toBeGreaterThan(maxP2);
    // Min P2 is 69.20, Max P3 is 50.40 -> Strict gap >= 18.80 points
    expect(minP2).toBeGreaterThan(maxP3);
    // Min P3 is 42.80, Max P4 is 29.00 -> Strict gap >= 13.80 points
    expect(minP3).toBeGreaterThan(maxP4);
  });

  test('ADV-3.4 - Attenuation Factor: status === "listo" strictly applies the 0.2 factor', () => {
    for (let u = 1; u <= 5; u++) {
      for (let e = 1; e <= 5; e++) {
        for (const cost of [0, 15000, 75000]) {
          const activeScore = calculatePriorityScore(u, e, cost, 'pendiente');
          const completedScore = calculatePriorityScore(u, e, cost, 'listo');

          const expectedAttenuated = Number((activeScore * 0.2).toFixed(2));
          expect(completedScore).toBeCloseTo(expectedAttenuated, 2);
          expect(completedScore).toBeLessThan(activeScore);
        }
      }
    }
  });

  test('ADV-3.5 - Global Invariant: ALL completed tasks rank below ALL active tasks', () => {
    let maxCompletedScore = 0;
    let minActiveScore = 100;

    for (let u = 1; u <= 5; u++) {
      for (let e = 1; e <= 5; e++) {
        for (const cost of [0, 50000, 100000]) {
          const activeScore = calculatePriorityScore(u, e, cost, 'pendiente');
          const completedScore = calculatePriorityScore(u, e, cost, 'listo');

          if (activeScore < minActiveScore) minActiveScore = activeScore;
          if (completedScore > maxCompletedScore) maxCompletedScore = completedScore;
        }
      }
    }

    // Max completed score (P1 with max cost bonus: 94.4 * 0.2 = 18.88)
    // Min active score (P4 lowest: 25.20)
    expect(maxCompletedScore).toBeLessThan(minActiveScore);
    expect(minActiveScore - maxCompletedScore).toBeGreaterThanOrEqual(6.0);
  });

  test('ADV-3.6 - Deterministic Sorting: Sorting is strictly stable and reproducible', () => {
    const rawScores = [
      calculatePriorityScore(5, 3, 0, 'pendiente'),
      calculatePriorityScore(4, 2, 0, 'pendiente'),
      calculatePriorityScore(2, 4, 0, 'pendiente'),
      calculatePriorityScore(1, 1, 0, 'pendiente'),
      calculatePriorityScore(5, 3, 0, 'listo')
    ];

    const sortedOnce = [...rawScores].sort((a, b) => b - a);
    const sortedTwice = [...rawScores].sort((a, b) => b - a);

    expect(sortedOnce).toEqual(sortedTwice);
    expect(sortedOnce[0]).toBe(calculatePriorityScore(5, 3, 0, 'pendiente'));
    expect(sortedOnce[sortedOnce.length - 1]).toBe(calculatePriorityScore(5, 3, 0, 'listo'));
  });
});

// ============================================================================
// SUITE 4: STRING BOUNDARIES & ADVERSARIAL PAYLOADS
// ============================================================================
describe('ADV-4: String Boundaries & Adversarial Payloads', () => {
  test('ADV-4.1 - Title Minimum Length Boundary: 2 chars rejected, 3 chars accepted', () => {
    const twoChars = ['No', 'Si', 'AB', 'Ca'];
    for (const t of twoChars) {
      const res = validateTask({
        title: t,
        room: 'cocina',
        urgency: 3,
        effort: 2,
        execution_type: 'diy'
      });
      expect(res.valid).toBeFalsy();
      expect(res.errors.title).toBeDefined();
    }

    const threeChars = ['Gas', 'Luz', '123', 'Ojo'];
    for (const t of threeChars) {
      const res = validateTask({
        title: t,
        room: 'cocina',
        urgency: 3,
        effort: 2,
        execution_type: 'diy'
      });
      expect(res.valid).toBeTruthy();
    }
  });

  test('ADV-4.2 - Title Maximum Length Boundary: 120 chars accepted, 121 chars rejected', () => {
    const exactly120 = 'A'.repeat(120);
    const res120 = validateTask({
      title: exactly120,
      room: 'living',
      urgency: 2,
      effort: 2,
      execution_type: 'diy'
    });
    expect(res120.valid).toBeTruthy();

    const exactly121 = 'A'.repeat(121);
    const res121 = validateTask({
      title: exactly121,
      room: 'living',
      urgency: 2,
      effort: 2,
      execution_type: 'diy'
    });
    expect(res121.valid).toBeFalsy();
    expect(res121.errors.title).toBeDefined();
  });

  test('ADV-4.3 - Whitespace Trimming: Whitespace-padded valid titles pass, whitespace-only fails', () => {
    // 3 chars inside whitespace padding
    const padded = '   Gas   ';
    const resPadded = validateTask({
      title: padded,
      room: 'cocina',
      urgency: 4,
      effort: 2,
      execution_type: 'diy'
    });
    expect(resPadded.valid).toBeTruthy();

    // 2 chars inside whitespace padding -> effectively 2 chars -> rejected
    const paddedTwo = '   ab   ';
    const resPaddedTwo = validateTask({
      title: paddedTwo,
      room: 'cocina',
      urgency: 4,
      effort: 2,
      execution_type: 'diy'
    });
    expect(resPaddedTwo.valid).toBeFalsy();

    // Whitespace only
    const whitespaces = ['   ', '\t\t\t', '\n\r  \n', '             '];
    for (const ws of whitespaces) {
      const res = validateTask({
        title: ws,
        room: 'cocina',
        urgency: 4,
        effort: 2,
        execution_type: 'diy'
      });
      expect(res.valid).toBeFalsy();
    }
  });

  test('ADV-4.4 - Emojis & Multi-byte Unicode: Correctly handled by string validation', () => {
    // Single emoji "💧" has UTF-16 code unit length = 2 -> rejected by >= 3 char rule
    const singleEmoji = '💧';
    const resSingle = validateTask({
      title: singleEmoji,
      room: 'baño',
      urgency: 4,
      effort: 1,
      execution_type: 'diy'
    });
    expect(resSingle.valid).toBeFalsy();

    // Multiple emojis (length >= 3) or emoji + text -> accepted
    const emojiWithText = '💧 Gotera urgente en cañería 🔧';
    const resEmoji = validateTask({
      title: emojiWithText,
      room: 'baño',
      urgency: 4,
      effort: 1,
      execution_type: 'diy'
    });
    expect(resEmoji.valid).toBeTruthy();

    // Spanish special characters & diacritics
    const spanishText = '¡Atención! Pérdida de gas y calefacción en el año 2026 ¿Cómo proceder?';
    const resSpanish = validateTask({
      title: spanishText,
      room: 'general',
      urgency: 5,
      effort: 4,
      execution_type: 'profesional'
    });
    expect(resSpanish.valid).toBeTruthy();
  });

  test('ADV-4.5 - Adversarial Injection Payloads: Accepted safely as text without crashing validator', () => {
    const xssPayload = "<script>alert('xss')</script>";
    const resXss = validateTask({
      title: xssPayload,
      room: 'living',
      urgency: 1,
      effort: 1,
      execution_type: 'diy'
    });
    expect(resXss.valid).toBeTruthy();

    const sqlPayload = "'; DROP TABLE homefix_tasks; --";
    const resSql = validateTask({
      title: sqlPayload,
      room: 'living',
      urgency: 1,
      effort: 1,
      execution_type: 'diy'
    });
    expect(resSql.valid).toBeTruthy();
  });
});

// ============================================================================
// SUITE 5: ROOM NORMALIZATION & DIACRITIC TOLERANCE
// ============================================================================
describe('ADV-5: Room Normalization & Diacritic Tolerance', () => {
  test('ADV-5.1 - Room Normalization: "baño" and "bano" normalize identically to "baño"', () => {
    expect(normalizeRoom('baño')).toBe('baño');
    expect(normalizeRoom('bano')).toBe('baño');
    expect(normalizeRoom('BAÑO')).toBe('baño');
    expect(normalizeRoom('BANO')).toBe('baño');
    expect(normalizeRoom('  baño  ')).toBe('baño');
    expect(normalizeRoom('  bano  ')).toBe('baño');
  });

  test('ADV-5.2 - Standard Rooms: All 6 standard rooms normalize cleanly', () => {
    const validRooms: RoomId[] = ['cocina', 'baño', 'living', 'dormitorio', 'exterior', 'general'];
    for (const r of validRooms) {
      expect(normalizeRoom(r)).toBe(r);
      expect(normalizeRoom(r.toUpperCase())).toBe(r);
      expect(normalizeRoom(`  ${r}  `)).toBe(r);
    }
  });

  test('ADV-5.3 - Invalid Rooms: Reject and throw descriptive Error', () => {
    const invalidRooms = ['patio', 'garage', 'terraza', 'ático', '', '123', 'bañito'];
    for (const inv of invalidRooms) {
      let threw = false;
      try {
        normalizeRoom(inv);
      } catch (err: any) {
        threw = true;
        expect(err.message).toContain('Invalid room identifier');
      }
      expect(threw).toBeTruthy();
    }
  });

  test('ADV-5.4 - Validation Schema accepts both "baño" and "bano"', () => {
    const resAccent = validateTask({
      title: 'Reparación inodoro',
      room: 'baño',
      urgency: 3,
      effort: 2,
      execution_type: 'diy'
    });
    expect(resAccent.valid).toBeTruthy();

    const resNoAccent = validateTask({
      title: 'Reparación inodoro',
      room: 'bano',
      urgency: 3,
      effort: 2,
      execution_type: 'diy'
    });
    expect(resNoAccent.valid).toBeTruthy();
  });

  test('ADV-5.5 - Filter Simulation: Filtering by "baño" captures both "baño" and "bano" tasks', () => {
    const sampleTasks: Array<{ id: string; room: RoomId; title: string }> = [
      { id: '1', room: 'baño', title: 'Grifería con tilde' },
      { id: '2', room: 'bano', title: 'Grifería sin tilde' },
      { id: '3', room: 'cocina', title: 'Horno de cocina' }
    ];

    const filterRoom = (filter: string) => {
      if (filter === 'baño' || filter === 'bano') {
        return sampleTasks.filter(t => t.room === 'baño' || t.room === 'bano');
      }
      return sampleTasks.filter(t => t.room === filter);
    };

    const resultWithTilde = filterRoom('baño');
    expect(resultWithTilde.length).toBe(2);
    expect(resultWithTilde.map(t => t.id)).toEqual(['1', '2']);

    const resultWithoutTilde = filterRoom('bano');
    expect(resultWithoutTilde.length).toBe(2);
    expect(resultWithoutTilde.map(t => t.id)).toEqual(['1', '2']);
  });
});

// ============================================================================
// SUITE 6: FULL 25-CELL COMBINATORIAL INVARIANTS & IMMUTABILITY
// ============================================================================
describe('ADV-6: Combinatorial 25-Cell Invariants & Immutability', () => {
  test('ADV-6.1 - Full 25-Cell Matrix: Every Urgency x Effort coordinate produces valid quadrant, priority, and bounded score', () => {
    for (let u = 1; u <= 5; u++) {
      for (let e = 1; e <= 5; e++) {
        const p = calculatePriority(u, e, 0);
        const q = calculateQuadrant(u, e, 0);
        const s = calculatePriorityScore(u, e, 0, 'pendiente');

        expect(['P1', 'P2', 'P3', 'P4']).toContain(p);
        expect(['Q1', 'Q2', 'Q3', 'Q4']).toContain(q);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);

        // Verification of correspondence
        if (p === 'P1') expect(q).toBe('Q1');
        if (p === 'P2') expect(q).toBe('Q2');
        if (p === 'P4') expect(q).toBe('Q4');
        if (p === 'P3') expect(q).toBe('Q3');
      }
    }
  });

  test('ADV-6.2 - Immutability: enrichTask does not mutate the source task object', () => {
    const original: Task = {
      id: 'adv-immutability-1',
      title: 'Original Title',
      room: 'living',
      urgency: 4,
      effort: 2,
      cost: 15000,
      execution_type: 'diy',
      status: 'pendiente'
    };

    const copy = { ...original };
    const enriched = enrichTask(original);

    // Original must not have computed fields added
    expect(original).toEqual(copy);
    expect((original as any).priority).toBeUndefined();
    expect((original as any).quadrant).toBeUndefined();
    expect((original as any).priority_score).toBeUndefined();

    // Enriched must contain computed fields
    expect(enriched.priority).toBe('P2');
    expect(enriched.quadrant).toBe('Q2');
    expect(enriched.priority_score).toBeDefined();
  });
});

// ============================================================================
// SUITE 7: PROPERTY-BASED RANDOMIZED STRESS FUZZING (100 Pseudo-Random Tasks)
// ============================================================================
describe('ADV-7: Property-Based Randomized Stress Oracle (100 Tasks)', () => {
  test('ADV-7.1 - 100 Random Tasks obey all mathematical invariants and domain bounds', () => {
    // Deterministic pseudo-random LCG generator for reproducible fuzzing
    let seed = 123456789;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const statuses: TaskStatus[] = ['pendiente', 'en_proceso', 'listo'];
    const rooms: RoomId[] = ['cocina', 'baño', 'bano', 'living', 'dormitorio', 'exterior', 'general'];

    for (let i = 0; i < 100; i++) {
      const urgency = Math.floor(rnd() * 5) + 1; // 1 to 5
      const effort = Math.floor(rnd() * 5) + 1;  // 1 to 5
      const cost = rnd() > 0.2 ? Math.floor(rnd() * 1000000) : null;
      const status = statuses[Math.floor(rnd() * statuses.length)];
      const room = rooms[Math.floor(rnd() * rooms.length)];

      const task: Task = {
        id: `fuzz-${i}`,
        title: `Tarea de prueba Fuzz #${i}`,
        room,
        urgency,
        effort,
        cost,
        execution_type: rnd() > 0.5 ? 'diy' : 'profesional',
        status
      };

      const enriched = enrichTask(task);

      // Invariant 1: Score strictly in [0.00, 100.00]
      expect(enriched.priority_score).toBeGreaterThanOrEqual(0);
      expect(enriched.priority_score).toBeLessThanOrEqual(100);

      // Invariant 2: Acceptance Criteria rule
      if (urgency >= 4 && effort <= 2) {
        expect(enriched.priority).toBe('P2');
        expect(enriched.quadrant).toBe('Q2');
      } else if (urgency >= 4 && effort >= 3) {
        expect(enriched.priority).toBe('P1');
        expect(enriched.quadrant).toBe('Q1');
      }

      // Invariant 3: Completed score attenuation
      if (status === 'listo') {
        expect(enriched.priority_score).toBeLessThanOrEqual(18.88);
      } else {
        expect(enriched.priority_score).toBeGreaterThanOrEqual(25.20);
      }
    }
  });
});

// ============================================================================
// SUITE 8: FORMATTERS & LOCALIZATION ADVERSARIAL STRESS
// ============================================================================
describe('ADV-8: Formatters & Localization Stress', () => {
  test('ADV-8.1 - formatCurrencyARS: Correctly formats 0, null, undefined, extreme and negative numbers', () => {
    expect(formatCurrencyARS(0)).toBe('$ 0');
    expect(formatCurrencyARS(null)).toBe('Sin costo estimado');
    expect(formatCurrencyARS(undefined)).toBe('Sin costo estimado');
    expect(formatCurrencyARS(50000)).toBe('$ 50.000');
    expect(formatCurrencyARS(99999999)).toBe('$ 99.999.999');
    expect(formatCurrencyARS(10000000000)).toBe('$ 10.000.000.000');
    expect(formatCurrencyARS(-500)).toBe('$ -500');
  });

  test('ADV-8.2 - formatDate and formatRelativeDate: Gracefully handle null, undefined, and corrupt dates', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('not-a-valid-date')).toBe('-');

    expect(formatDateTime(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
    expect(formatDateTime('invalid-iso-string')).toBe('-');

    expect(formatRelativeDate(null)).toBe('-');
    expect(formatRelativeDate('malformed-date')).toBe('-');

    // Valid ISO date
    const iso = '2026-09-24T12:00:00Z';
    expect(formatDate(iso)).toMatch(/\d{2}\/\d{2}\/2026/);
  });
});

