import assert from 'node:assert/strict';
import test from 'node:test';

import { diagnoseOrganizationFailure } from '../scripts/organization_debug_engine.mjs';

const execution = {
  enterpriseId: 'acme-demo',
  businessProjectId: '20260729-101-org-build-001',
  taskId: '20260729-101-org-v2-runtime',
  primarySkill: 'talent-allocation',
  currentStageId: 'job-design',
};

test('调试结果包含最小修复和关联回归范围', () => {
  const result = diagnoseOrganizationFailure({
    execution,
    observation: {
      code: 'job-not-evidence-based',
      category: 'business-logic',
      rootCauseKey: 'job-design|missing-business-outcome',
      evidenceRefs: ['evidence-index.json#e1'],
      impactedArtifacts: ['job-description'],
      repairAction: 'return-to-organization-staffing',
      nonIdempotent: false,
    },
    priorDiagnostics: [],
    now: () => new Date('2026-07-29T09:10:00.000Z'),
  });
  assert.equal(result.nextStatus, 'debugging');
  assert.deepEqual(result.regressionScope, ['job-description']);
});

test('同一根因第三轮停止且非幂等动作不自动重试', () => {
  const previous = [
    { rootCauseKey: 'job-design|missing-business-outcome', attempt: 1 },
    { rootCauseKey: 'job-design|missing-business-outcome', attempt: 2 },
  ];
  assert.equal(diagnoseOrganizationFailure({
    execution,
    observation: {
      code: 'job-not-evidence-based',
      category: 'business-logic',
      rootCauseKey: 'job-design|missing-business-outcome',
      evidenceRefs: [],
      impactedArtifacts: ['job-description'],
      repairAction: 'return-to-organization-staffing',
      nonIdempotent: false,
    },
    priorDiagnostics: previous,
  }).nextStatus, 'failed');
  assert.equal(diagnoseOrganizationFailure({
    execution,
    observation: {
      code: 'payroll-write-failed',
      category: 'compliance-risk',
      rootCauseKey: 'payroll|external-write',
      evidenceRefs: [],
      impactedArtifacts: ['payroll'],
      repairAction: 'manual-review',
      nonIdempotent: true,
    },
    priorDiagnostics: [],
  }).nextStatus, 'waiting_decision');
});
