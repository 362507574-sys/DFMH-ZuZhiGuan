import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOrganizationExecutionPlan } from '../scripts/organization_execution_planner.mjs';
import { invocation } from './organization_v2_fixtures.mjs';

test('单Skill规划不会强制执行三个Skill', () => {
  const plan = buildOrganizationExecutionPlan({
    invocation: invocation(),
    availableInputs: [],
    now: () => new Date('2026-07-29T09:00:00.000Z'),
  });
  assert.deepEqual(plan.capabilitySequence, ['talent-allocation']);
  assert.ok(plan.stages.some((item) => item.id === 'job-design'));
  assert.ok(!plan.stages.some((item) => item.id === 'training-path'));
});

test('连续链严格遵守总控授权的三Skill顺序', () => {
  const plan = buildOrganizationExecutionPlan({
    invocation: invocation({
      mode: 'continuous-chain',
      allowedCapabilityChain: [
        'talent-allocation',
        'talent-development',
        'process-replication',
      ],
    }),
    availableInputs: [],
    now: () => new Date('2026-07-29T09:00:00.000Z'),
  });
  assert.deepEqual(plan.capabilitySequence, [
    'talent-allocation',
    'talent-development',
    'process-replication',
  ]);
  assert.ok(plan.stages.some((item) => item.id === 'training-path'));
  assert.ok(plan.stages.some((item) => item.id === 'sop-forms-checklists'));
});
