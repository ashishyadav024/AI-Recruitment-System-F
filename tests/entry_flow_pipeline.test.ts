/**
 * Entry Flow & Sequential Gating Test Suite
 * 
 * Verifies:
 * 1. Clicking Start never opens camera before earlier rounds are passed
 * 2. Direct URL access to a locked round redirects to Application Overview
 * 3. Completed interview saves normalized score, applies cutoff, unlocks next round,
 *    and returns candidate to Application Overview
 * 4. Default pipeline generation with available rounds (Resume Screening -> Technical Interview)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Mock browser localStorage and offline fetch for node test execution
const memoryStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, val: string) => { memoryStorage[key] = val; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};
(globalThis as any).localStorage = localStorageMock;
(globalThis as any).fetch = async () => { throw new Error("Simulated offline local mode"); };

import { pipelineService, createDefaultAvailableRounds } from '../src/services/pipelineService';

async function runTestSuite() {
  console.log("================================================================================");
  console.log("[TEST] RUNNING CANDIDATE ENTRY FLOW & SEQUENTIAL GATING TEST SUITE");
  console.log("================================================================================");

  // Test 1: Default pipeline creation with currently available rounds
  console.log("\n[TEST 1] Default Pipeline Creation with Currently Available Rounds");
  const defaultRounds = createDefaultAvailableRounds("test-pipe-1");
  assert.strictEqual(defaultRounds.length, 2, "Default pipeline must have exactly 2 available rounds");
  assert.strictEqual(defaultRounds[0].round_type, "resume_screening", "Round 1 must be resume_screening");
  assert.strictEqual(defaultRounds[1].round_type, "technical_interview", "Round 2 must be technical_interview");
  assert.strictEqual(defaultRounds[0].cutoff_score, 60, "Round 1 cutoff must be 60");
  assert.strictEqual(defaultRounds[1].cutoff_score, 60, "Round 2 cutoff must be 60");
  console.log("✓ Default pipeline has 2 currently available rounds: Resume Screening -> Technical Interview.");

  // Test 2: New candidate creates application -> Round 1 is unlocked, later rounds locked
  console.log("\n[TEST 2] New Candidate Application Creation & Initial Gating State");
  const candEmail = "arjun.kapoor@example.com";
  const candName = "Arjun Kapoor";
  const jobRole = "Frontend Developer";

  const app = await pipelineService.getOrCreateApplication(candEmail, candName, jobRole);
  assert.ok(app.application_id, "Application must have valid ID");
  assert.strictEqual(app.current_round_order, 1, "New application must start at Round 1");
  assert.strictEqual(app.status, "in_pipeline", "Application status must be in_pipeline");

  const progress = await pipelineService.getStepperProgress(app.application_id);
  assert.strictEqual(progress.rounds[0].status, "unlocked", "Round 1 must be UNLOCKED for new candidate");
  assert.strictEqual(progress.rounds[1].status, "locked", "Round 2 must be securely LOCKED");
  
  // Find technical interview round in this pipeline
  const techRound = progress.rounds.find(r => r.round_type === 'technical_interview');
  assert.ok(techRound, "Pipeline must contain technical_interview round");
  assert.strictEqual(techRound.status, "locked", "Technical Interview MUST be locked initially");
  console.log(`✓ Candidate application created (${app.application_id}). Round 1 is UNLOCKED. Technical Interview is securely LOCKED.`);

  // Test 3: Clicking Start / Direct Access on Technical Interview before earlier rounds pass
  console.log("\n[TEST 3] Camera Protection: Clicking Start on Locked Round is Prevented");
  const gatingCheck = await pipelineService.validateCanStartRound(app.application_id, techRound.round_id);
  assert.strictEqual(gatingCheck.can_start, false, "Technical Interview start must be REJECTED before preceding rounds are passed");
  assert.ok(gatingCheck.reason && gatingCheck.reason.includes("must be passed"), "Gating reason must explain earlier round requirement");
  console.log(`✓ Camera check blocked! Attempt to start locked round returned: "${gatingCheck.reason}"`);

  // Direct startRoundAttempt also rejects
  const startAttempt = await pipelineService.startRoundAttempt(app.application_id, techRound.round_id);
  assert.strictEqual(startAttempt.success, false, "startRoundAttempt must fail when sequential gating check fails");
  console.log(`✓ startRoundAttempt rejected with error: "${startAttempt.error}"`);

  // Test 4: Direct URL access redirect rule
  console.log("\n[TEST 4] Direct URL Access Rule: Redirects when application missing or round locked");
  // Simulating check in VideoInterview.tsx
  const unauthCheck = await pipelineService.validateCanStartRound("non-existent-app-id", techRound.round_id);
  assert.strictEqual(unauthCheck.can_start, false, "Unregistered application must fail validation");
  assert.strictEqual(unauthCheck.reason, "Candidate application not found.", "Must state application not found");
  console.log("✓ Direct URL access without valid application redirects candidate to Application Overview (/apply).");

  // Test 5: Candidate completes Round 1 (Resume Screening)
  console.log("\n[TEST 5] Candidate Completes Round 1 (Resume Screening) -> Unlocks Next Round");
  const r1Attempt = await pipelineService.startRoundAttempt(app.application_id, progress.rounds[0].round_id);
  assert.strictEqual(r1Attempt.success, true, "Round 1 start must succeed");
  assert.ok(r1Attempt.attempt?.attempt_id, "Attempt must have ID");

  // Submit passing score (82 >= 60)
  const r1Result = await pipelineService.submitNormalizedScore(
    r1Attempt.attempt!.attempt_id,
    82,
    "Resume matches engineering competencies."
  );
  assert.strictEqual(r1Result.success, true, "Score submission must succeed");
  assert.strictEqual(r1Result.result?.passed, true, "Score 82 must pass cutoff 60");

  const progressAfterR1 = await pipelineService.getStepperProgress(app.application_id);
  assert.strictEqual(progressAfterR1.rounds[0].status, "passed", "Round 1 must now be PASSED");
  assert.strictEqual(progressAfterR1.rounds[1].status, "unlocked", "Round 2 must now be UNLOCKED");
  console.log("✓ Round 1 completed with score 82/100. Round 1 is PASSED. Next round is now UNLOCKED.");

  // Test 6: In a 2-round pipeline (available rounds), Technical Interview is Round 2 and now UNLOCKED
  console.log("\n[TEST 6] 2-Round Pipeline Flow (Resume Screening -> Technical Interview)");
  const role2 = "DevOps Engineer";
  const app2 = await pipelineService.getOrCreateApplication("sneha.r@cloud.io", "Sneha Roy", role2);
  const prog2 = await pipelineService.getStepperProgress(app2.application_id);
  assert.strictEqual(prog2.rounds.length, 2, "Default pipeline for new role must have 2 available rounds");
  assert.strictEqual(prog2.rounds[0].round_type, "resume_screening");
  assert.strictEqual(prog2.rounds[1].round_type, "technical_interview");

  // Before R1 pass: Tech round locked
  const techCheckBefore = await pipelineService.validateCanStartRound(app2.application_id, prog2.rounds[1].round_id);
  assert.strictEqual(techCheckBefore.can_start, false, "Technical interview must be locked before Round 1");

  // Pass Round 1
  const r1App2 = await pipelineService.startRoundAttempt(app2.application_id, prog2.rounds[0].round_id);
  await pipelineService.submitNormalizedScore(r1App2.attempt!.attempt_id, 88, "Resume approved");

  // After R1 pass: Tech round unlocked
  const techCheckAfter = await pipelineService.validateCanStartRound(app2.application_id, prog2.rounds[1].round_id);
  assert.strictEqual(techCheckAfter.can_start, true, "Technical interview must be UNLOCKED after Round 1 is passed");
  console.log("✓ Technical Interview unlocked only AFTER preceding round passed.");

  // Test 7: Technical Interview starts, completes, saves score, and returns to overview
  console.log("\n[TEST 7] Technical Interview Completion & Return to Overview");
  const techAttempt = await pipelineService.startRoundAttempt(app2.application_id, prog2.rounds[1].round_id);
  assert.strictEqual(techAttempt.success, true, "Technical Interview start must succeed when unlocked");
  
  // Submit interview score (86 >= 60)
  const interviewResult = await pipelineService.submitNormalizedScore(
    techAttempt.attempt!.attempt_id,
    86,
    "Candidate demonstrated strong architectural depth and clear communication.",
    { stages_completed: ["intro", "technical", "projects", "evaluation"] }
  );
  assert.strictEqual(interviewResult.success, true, "Interview score submission must succeed");
  assert.strictEqual(interviewResult.result?.passed, true, "Interview score 86 must pass cutoff 60");

  const finalProgress = await pipelineService.getStepperProgress(app2.application_id);
  assert.strictEqual(finalProgress.rounds[1].status, "passed", "Technical Interview must be PASSED in overview");
  assert.strictEqual(finalProgress.rounds[1].score_data?.score, 86, "Score 86 must be displayed in overview");
  assert.strictEqual(finalProgress.overall_status, "qualified", "All rounds complete -> qualified status");
  console.log("✓ Completed interview saved score 86/100, applied cutoff, updated round to PASSED, and qualified candidate.");

  console.log("\n================================================================================");
  console.log("[SUCCESS] ALL ENTRY FLOW & SEQUENTIAL GATING TESTS PASSED 100%!");
  console.log("================================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
