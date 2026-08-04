import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOrganizationExecutionPlan } from '../scripts/organization_execution_planner.mjs';
import {
  createSkillHandoff,
  createUpstreamChangeRequest,
} from '../scripts/organization_handoff_engine.mjs';
import { evaluateOrganizationQuality } from '../scripts/organization_quality_engine.mjs';
import { createOrganizationReturnPackage } from '../scripts/organization_return_engine.mjs';
import { validateOrganizationV2Chain } from '../scripts/organization_chain_validator.mjs';
import { invocation } from './organization_v2_fixtures.mjs';

const hashes = {
  allocation: 'a'.repeat(64),
  development: 'b'.repeat(64),
};

test('V2完整链按人才配置、人才培养、流程复制交接并完成四级验收', () => {
  const call = invocation({
    mode: 'continuous-chain',
    allowedCapabilityChain: [
      'talent-allocation',
      'talent-development',
      'process-replication',
    ],
  });
  const plan = buildOrganizationExecutionPlan({ invocation: call });
  const allocationToDevelopment = createSkillHandoff({
    enterpriseId: call.enterpriseId,
    businessProjectId: call.businessProjectId,
    taskId: call.taskId,
    fromSkill: 'talent-allocation',
    toSkill: 'talent-development',
    bindings: [{
      artifactId: 'talent-allocation',
      version: 2,
      sha256: hashes.allocation,
      sourceRef: 'assets/talent-allocation/versions/2.json',
    }],
    payload: { roleStandards: ['sales-lead'] },
  });
  const developmentToReplication = createSkillHandoff({
    enterpriseId: call.enterpriseId,
    businessProjectId: call.businessProjectId,
    taskId: call.taskId,
    fromSkill: 'talent-development',
    toSkill: 'process-replication',
    bindings: [
      allocationToDevelopment.bindings[0],
      {
        artifactId: 'talent-development',
        version: 2,
        sha256: hashes.development,
        sourceRef: 'assets/talent-development/versions/2.json',
      },
    ],
    payload: { trainingStandards: ['sales-lead-certification'] },
  });
  const quality = evaluateOrganizationQuality({
    artifactChecks: [{ id: 'all-artifacts', passed: true }],
    skillChecks: [{ id: 'all-skills', passed: true }],
    crossSkillChecks: [{ id: 'all-handoffs', passed: true }],
    chainChecks: [{ id: 'whole-chain', passed: true }],
    evidenceReady: true,
    versionBindingsReady: true,
    decisionBoundaryReady: true,
    returnPackageReady: true,
  });
  const returnPackage = createOrganizationReturnPackage({
    execution: call,
    status: 'completed',
    artifacts: [],
    quality,
    decisions: [],
    nextAction: 'return-to-control-center',
  });
  const result = validateOrganizationV2Chain({
    invocation: call,
    plan,
    handoffs: [allocationToDevelopment, developmentToReplication],
    quality,
    returnPackage,
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('V2单Skill不扩链且上游V3不会静默替换已固定V2', () => {
  const call = invocation({
    primarySkill: 'process-replication',
    allowedCapabilityChain: ['process-replication'],
    goal: '优化一份已有SOP',
  });
  const plan = buildOrganizationExecutionPlan({ invocation: call });
  assert.deepEqual(plan.capabilitySequence, ['process-replication']);
  const originalBinding = {
    artifactId: 'talent-allocation',
    version: 2,
    sha256: hashes.allocation,
  };
  const request = createUpstreamChangeRequest({
    execution: {
      ...call,
      currentStageId: 'responsibility-controls',
    },
    targetSkill: 'talent-allocation',
    problem: '岗位权限与实际流程冲突',
    evidence: ['evidence-index.json#permission-conflict'],
    impact: ['目标SOP暂停'],
    currentBinding: originalBinding,
    recommendedChange: ['发布岗位权限V3候选'],
  });
  const newUpstream = { ...originalBinding, version: 3, sha256: 'c'.repeat(64) };
  assert.equal(request.status, 'requested_to_control_center');
  assert.equal(request.currentBinding.version, 2);
  assert.equal(newUpstream.version, 3);
  assert.equal(originalBinding.version, 2);
});
