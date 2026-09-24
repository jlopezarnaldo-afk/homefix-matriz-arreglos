/**
 * HomeFix E2E Test Suite - Custom Autonomous Test Harness
 * 
 * Provides standalone, zero-dependency BDD assertions, test runner,
 * structured tier tracking, timing, and formatted CLI reporting.
 */

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

export interface SuiteResult {
  name: string;
  tier: string;
  tests: TestResult[];
  durationMs: number;
}

export type TestFn = () => void | Promise<void>;

interface RegisteredSuite {
  name: string;
  tier: string;
  tests: Array<{ name: string; fn: TestFn }>;
}

class TestRegistry {
  public suites: RegisteredSuite[] = [];
  public currentSuite: RegisteredSuite | null = null;
  public currentTier: string = 'General';

  public setTier(tier: string) {
    this.currentTier = tier;
  }

  public registerSuite(name: string, tier?: string) {
    const suite: RegisteredSuite = {
      name,
      tier: tier || this.currentTier,
      tests: []
    };
    this.suites.push(suite);
    this.currentSuite = suite;
    return suite;
  }

  public registerTest(name: string, fn: TestFn) {
    if (!this.currentSuite) {
      this.registerSuite('Default Suite');
    }
    this.currentSuite!.tests.push({ name, fn });
  }

  public clear() {
    this.suites = [];
    this.currentSuite = null;
  }
}

export const registry = new TestRegistry();

export function setTier(tier: string) {
  registry.setTier(tier);
}

let vDescribe: any = null;
let vTest: any = null;

if (process.env.VITEST) {
  try {
    const v = await import('vitest');
    vDescribe = v.describe;
    vTest = v.test;
  } catch {
    // Fallback to custom registry if vitest state fails
  }
}

export function describe(name: string, fn: () => void, tier?: string) {
  if (vDescribe) {
    vDescribe(`[${tier || registry.currentTier}] ${name}`, fn);
    return;
  }
  const previousSuite = registry.currentSuite;
  registry.registerSuite(name, tier);
  try {
    fn();
  } finally {
    registry.currentSuite = previousSuite;
  }
}

export function test(name: string, fn: TestFn) {
  if (vTest) {
    vTest(name, fn);
    return;
  }
  registry.registerTest(name, fn);
}

export const it = test;

// Deep equality helper
function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

export interface Expectation {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeCloseTo(expected: number, numDigits?: number): void;
  toContain(item: any): void;
  toMatch(regex: RegExp | string): void;
  toThrow(expected?: string | RegExp): void;
  toHaveLength(length: number): void;
  not: Expectation;
}

export function expect(actual: any, isNot: boolean = false): Expectation {
  const assert = (condition: boolean, message: string) => {
    const finalCondition = isNot ? !condition : condition;
    if (!finalCondition) {
      const prefix = isNot ? '[NOT assertion failed]: ' : '[Assertion failed]: ';
      throw new Error(prefix + message);
    }
  };

  const expectation: Expectation = {
    toBe(expected: any) {
      assert(
        Object.is(actual, expected),
        `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`
      );
    },
    toEqual(expected: any) {
      assert(
        deepEqual(actual, expected),
        `Expected deep equality:\nActual:   ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`
      );
    },
    toBeTruthy() {
      assert(Boolean(actual), `Expected ${JSON.stringify(actual)} to be truthy`);
    },
    toBeFalsy() {
      assert(!actual, `Expected ${JSON.stringify(actual)} to be falsy`);
    },
    toBeNull() {
      assert(actual === null, `Expected ${JSON.stringify(actual)} to be null`);
    },
    toBeUndefined() {
      assert(actual === undefined, `Expected ${JSON.stringify(actual)} to be undefined`);
    },
    toBeDefined() {
      assert(actual !== undefined, `Expected value to be defined, but got undefined`);
    },
    toBeGreaterThan(expected: number) {
      assert(
        typeof actual === 'number' && actual > expected,
        `Expected ${actual} > ${expected}`
      );
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert(
        typeof actual === 'number' && actual >= expected,
        `Expected ${actual} >= ${expected}`
      );
    },
    toBeLessThan(expected: number) {
      assert(
        typeof actual === 'number' && actual < expected,
        `Expected ${actual} < ${expected}`
      );
    },
    toBeLessThanOrEqual(expected: number) {
      assert(
        typeof actual === 'number' && actual <= expected,
        `Expected ${actual} <= ${expected}`
      );
    },
    toBeCloseTo(expected: number, numDigits: number = 2) {
      const precision = Math.pow(10, -numDigits) / 2;
      const diff = Math.abs(actual - expected);
      assert(
        diff <= precision,
        `Expected ${actual} to be close to ${expected} (within ${precision}, difference was ${diff})`
      );
    },
    toContain(item: any) {
      if (typeof actual === 'string') {
        assert(actual.includes(String(item)), `Expected "${actual}" to contain "${item}"`);
      } else if (Array.isArray(actual)) {
        const found = actual.some(x => deepEqual(x, item));
        assert(found, `Expected array to contain ${JSON.stringify(item)}`);
      } else if (actual instanceof Set) {
        assert(actual.has(item), `Expected Set to contain ${JSON.stringify(item)}`);
      } else {
        throw new Error(`toContain requires string, array, or Set; received ${typeof actual}`);
      }
    },
    toMatch(regex: RegExp | string) {
      const re = typeof regex === 'string' ? new RegExp(regex) : regex;
      assert(re.test(String(actual)), `Expected "${actual}" to match pattern ${re}`);
    },
    toThrow(expected?: string | RegExp) {
      if (typeof actual !== 'function') {
        throw new Error(`toThrow requires a function; received ${typeof actual}`);
      }
      let threw = false;
      let thrownError: any = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        thrownError = err;
      }
      assert(threw, `Expected function to throw an error, but it returned cleanly`);
      if (expected && thrownError) {
        const msg = thrownError.message || String(thrownError);
        if (typeof expected === 'string') {
          assert(
            msg.includes(expected),
            `Expected thrown error "${msg}" to contain "${expected}"`
          );
        } else {
          assert(
            expected.test(msg),
            `Expected thrown error "${msg}" to match pattern ${expected}`
          );
        }
      }
    },
    toHaveLength(length: number) {
      const actualLen = actual?.length ?? actual?.size;
      assert(
        actualLen === length,
        `Expected length of ${length}, but got ${actualLen}`
      );
    },
    get not() {
      return expect(actual, !isNot);
    }
  };

  return expectation;
}

export interface RunSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  durationMs: number;
  tierBreakdown: Record<string, { total: number; passed: number; failed: number }>;
  allPassed: boolean;
}

export async function runSuites(): Promise<RunSummary> {
  const startTime = Date.now();
  const suiteResults: SuiteResult[] = [];
  const tierBreakdown: Record<string, { total: number; passed: number; failed: number }> = {};

  console.log('\n================================================================');
  console.log('       HOMEFIX E2E TEST RUNNER — 4-TIER SPECIFICATION SUITE     ');
  console.log('================================================================\n');

  for (const suite of registry.suites) {
    const suiteStart = Date.now();
    const testResults: TestResult[] = [];

    console.log(`\n▶ [${suite.tier}] ${suite.name}`);

    if (!tierBreakdown[suite.tier]) {
      tierBreakdown[suite.tier] = { total: 0, passed: 0, failed: 0 };
    }

    for (const testCase of suite.tests) {
      const testStart = Date.now();
      let passed = false;
      let error: Error | undefined = undefined;

      try {
        const result = testCase.fn();
        if (result && typeof (result as any).then === 'function') {
          await result;
        }
        passed = true;
      } catch (err: any) {
        passed = false;
        error = err;
      }

      const durationMs = Date.now() - testStart;
      testResults.push({
        name: testCase.name,
        passed,
        durationMs,
        error
      });

      tierBreakdown[suite.tier].total++;
      if (passed) {
        tierBreakdown[suite.tier].passed++;
        console.log(`   ✔ ${testCase.name} (${durationMs}ms)`);
      } else {
        tierBreakdown[suite.tier].failed++;
        console.log(`   ✖ ${testCase.name} (${durationMs}ms)`);
        console.log(`     Error: ${error?.message}`);
        if (error?.stack) {
          const lines = error.stack.split('\n').slice(1, 4).join('\n');
          console.log(`     ${lines}`);
        }
      }
    }

    suiteResults.push({
      name: suite.name,
      tier: suite.tier,
      tests: testResults,
      durationMs: Date.now() - suiteStart
    });
  }

  const totalDurationMs = Date.now() - startTime;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const tier in tierBreakdown) {
    totalTests += tierBreakdown[tier].total;
    totalPassed += tierBreakdown[tier].passed;
    totalFailed += tierBreakdown[tier].failed;
  }

  console.log('\n================================================================');
  console.log('                       TEST EXECUTION SUMMARY                   ');
  console.log('================================================================');
  console.log(`Total Suites:     ${registry.suites.length}`);
  console.log(`Total Test Cases: ${totalTests}`);
  console.log(`Passed:           ${totalPassed}`);
  console.log(`Failed:           ${totalFailed}`);
  console.log(`Total Duration:   ${(totalDurationMs / 1000).toFixed(2)}s\n`);

  console.log('--- Tier Breakdown ---');
  for (const [tier, stats] of Object.entries(tierBreakdown)) {
    const status = stats.failed === 0 ? '✔ PASS' : '✖ FAIL';
    console.log(`  ${tier.padEnd(28)} : ${stats.passed}/${stats.total} passed [${status}]`);
  }
  console.log('================================================================\n');

  const allPassed = totalFailed === 0;
  return {
    totalSuites: registry.suites.length,
    totalTests,
    totalPassed,
    totalFailed,
    durationMs: totalDurationMs,
    tierBreakdown,
    allPassed
  };
}
