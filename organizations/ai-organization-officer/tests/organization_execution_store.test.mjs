import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createOrganizationExecutionStore } from '../scripts/organization_execution_store.mjs';

async function workspace() {
  const taskRoot = await mkdtemp(path.join(tmpdir(), 'ai-org-v2-store-'));
  await mkdir(path.join(taskRoot, 'debug-records'), { recursive: true });
  return {
    taskRoot,
    executionFile: path.join(taskRoot, 'execution.json'),
    timelineFile: path.join(taskRoot, 'execution-timeline.json'),
  };
}

function execution() {
  return {
    schemaVersion: 2,
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
    planVersion: 1,
    primarySkill: 'talent-allocation',
    status: 'planning',
    revision: 1,
    currentStageId: 'context-lock',
    checkpoint: null,
    failureCounts: {},
    createdAt: '2026-07-29T09:00:00.000Z',
    updatedAt: '2026-07-29T09:00:00.000Z',
  };
}

test('执行存储按修订号推进并保存安全检查点', async () => {
  const store = createOrganizationExecutionStore({
    workspace: await workspace(),
    now: () => new Date('2026-07-29T09:01:00.000Z'),
  });
  await store.create(execution());
  const next = await store.transition({
    expectedRevision: 1,
    from: 'planning',
    to: 'evidence',
    currentStageId: 'evidence-preflight',
    checkpoint: { id: 'cp-001', safeToResume: true, sideEffect: 'none' },
  });
  assert.equal(next.revision, 2);
  assert.equal(next.checkpoint.id, 'cp-001');
  const restored = await store.resume({
    expectedRevision: 2,
    invocationIdentity: {
      enterpriseId: 'acme-demo',
      businessProjectId: '20260729-101-org-build-001',
      taskId: '20260729-101-org-v2-runtime',
    },
  });
  assert.equal(restored.checkpoint.id, 'cp-001');
});

test('执行存储拒绝跳级、并发覆盖和不安全恢复', async () => {
  const store = createOrganizationExecutionStore({ workspace: await workspace() });
  await store.create(execution());
  await assert.rejects(store.transition({
    expectedRevision: 1,
    from: 'planning',
    to: 'completed',
    currentStageId: 'return',
  }), /not allowed/u);
  await assert.rejects(store.transition({
    expectedRevision: 2,
    from: 'planning',
    to: 'evidence',
    currentStageId: 'evidence-preflight',
  }), /revision/u);
  await assert.rejects(store.resume({
    expectedRevision: 1,
    invocationIdentity: {
      enterpriseId: 'acme-demo',
      businessProjectId: '20260729-101-org-build-001',
      taskId: '20260729-101-org-v2-runtime',
    },
  }), /checkpoint/u);
});
