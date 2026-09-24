/**
 * HomeFix E2E Test Suite — Master Test Runner
 * 
 * Executes all 4 tiers of tests:
 * - Tier 1: Feature Coverage (F1 to F13)
 * - Tier 2: Boundary & Corner Cases (B1 to B6)
 * - Tier 3: Cross-Feature Combinations (C1 to C4)
 * - Tier 4: Real-World Application Scenarios (S1 to S6)
 * 
 * Provides structured terminal reporting and exits with code 0 on success, 1 on failure.
 */

import { runSuites } from './harness.ts';

// Import all test suites to register them in the harness
import './tier1_features.test.ts';
import './tier2_boundaries.test.ts';
import './tier3_combinations.test.ts';
import './tier4_real_world.test.ts';
import './tier5_adversarial.test.ts';

async function main() {
  try {
    const summary = await runSuites();
    if (summary.allPassed) {
      console.log('🎉 ALL HOMEFIX E2E TESTS PASSED SUCCESSFULLY! (Exit code 0)\n');
      process.exit(0);
    } else {
      console.error(`💥 ${summary.totalFailed} TEST(S) FAILED. (Exit code 1)\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 FATAL ERROR DURING TEST EXECUTION:', err);
    process.exit(1);
  }
}

main();
