import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { createOrganizationTaskStore } from '../scripts/organization_task_store.mjs';
import {
  accessEnvelope,
  makeProjectFixture,
  organizationTask,
} from './helpers.mjs';
import { organizationRoot } from './helpers.mjs';

const now = () => new Date('2026-07-28T01:00:00.000Z');

test('任务按合法状态推进并在恢复时保持企业、任务和版本', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createOrganizationTaskStore({ projectRoot, now });
  const created = await store.createTask(organizationTask());
  const duplicate = await store.createTask(organizationTask());
  assert.deepEqual(duplicate, created);

  const identifying = await store.transition({
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    from: 'received',
    to: 'identifying_context',
    expectedRevision: 1,
    evidenceRefs: [],
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  const preflight = await store.transition({
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    from: 'identifying_context',
    to: 'knowledge_preflight',
    expectedRevision: identifying.revision,
    evidenceRefs: [],
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  const diagnosed = await store.transition({
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    from: 'knowledge_preflight',
    to: 'diagnosing',
    expectedRevision: preflight.revision,
    evidenceRefs: ['evidence/knowledge_context.json'],
    knowledgeStatus: 'no_hit',
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  assert.equal(diagnosed.status, 'diagnosing');
  const building = await store.transition({
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    from: 'diagnosing',
    to: 'candidate_building',
    expectedRevision: diagnosed.revision,
    evidenceRefs: [],
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  const review = await store.transition({
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    from: 'candidate_building',
    to: 'quality_review',
    expectedRevision: building.revision,
    evidenceRefs: ['candidates/talent-allocation-v1.json'],
    candidateVersion: 1,
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  assert.equal(review.candidateVersion, 1);

  const restored = await (await createOrganizationTaskStore({ projectRoot, now })).readTask({
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    accessEnvelope: accessEnvelope(),
  });
  assert.equal(restored.enterpriseId, 'acme-demo');
  assert.equal(restored.taskId, created.taskId);
  assert.equal(restored.revision, review.revision);
});

test('拒绝跳过状态、跨企业重用任务和无决策批准', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createOrganizationTaskStore({ projectRoot, now });
  const created = await store.createTask(organizationTask());
  await assert.rejects(
    store.transition({
      enterpriseId: 'acme-demo',
      taskId: created.taskId,
      from: 'received',
      to: 'archived_formal',
      expectedRevision: 1,
      evidenceRefs: [],
      accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
    }),
    /transition.*not allowed/u,
  );
  await assert.rejects(
    store.createTask(organizationTask({
      enterpriseId: 'beta-demo',
      idempotencyKey: created.idempotencyKey,
    })),
    /idempotency.*conflict|enterprise/u,
  );
});

test('同一根因第三次失败后进入终态且不能复活', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createOrganizationTaskStore({ projectRoot, now });
  const created = await store.createTask(organizationTask());
  const params = {
    enterpriseId: 'acme-demo',
    taskId: created.taskId,
    rootCauseId: 'acme-demo|talent-allocation|knowledge|timeout',
    errorCode: 'knowledge_timeout',
    evidenceRefs: ['evidence/failure.json'],
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  };
  await store.recordFailure(params);
  await store.recordFailure(params);
  const failed = await store.recordFailure(params);
  assert.equal(failed.status, 'failed');
  await assert.rejects(
    store.transition({
      enterpriseId: 'acme-demo',
      taskId: created.taskId,
      from: 'failed',
      to: 'diagnosing',
      expectedRevision: failed.revision,
      evidenceRefs: [],
      accessEnvelope: params.accessEnvelope,
    }),
    /terminal/u,
  );
});

test('任务存储接受AI组织官三个正式能力', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createOrganizationTaskStore({ projectRoot, now });
  const development = organizationTask({
    taskId: '20260728-002-talent-development',
    parentTaskId: '20260728-002-talent-development',
    idempotencyKey: 'acme-demo|20260728-002-talent-development',
    capabilityId: 'talent-development',
  });
  assert.equal((await store.createTask(development)).capabilityId, 'talent-development');
  const schema = JSON.parse(await readFile(
    path.join(organizationRoot, 'contracts', 'organization-task.schema.json'),
    'utf8',
  ));
  assert.deepEqual(
    schema.properties.capabilityId.enum,
    ['talent-allocation', 'talent-development', 'process-replication'],
  );
  const replication = organizationTask({
    taskId: '20260728-003-process-replication',
    parentTaskId: '20260728-003-process-replication',
    idempotencyKey: 'acme-demo|20260728-003-process-replication',
    capabilityId: 'process-replication',
  });
  assert.equal((await store.createTask(replication)).capabilityId, 'process-replication');
});
