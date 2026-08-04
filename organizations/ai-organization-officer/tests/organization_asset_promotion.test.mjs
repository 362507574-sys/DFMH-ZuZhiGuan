import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { sha256File } from '../../../scripts/feishu-commander/atomic_store.mjs';
import { promoteApprovedOrganizationAsset } from '../scripts/organization_asset_promotion.mjs';
import {
  accessEnvelope,
  makeProjectFixture,
  organizationTask,
  writeJson,
} from './helpers.mjs';

const decidedAt = '2026-07-29T06:00:00.000Z';

function replicationCandidate(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: '20260729-003-process-replication',
    enterpriseId: 'acme-demo',
    version: 1,
    evidenceIndex: [{ ref: 'evidence/knowledge_context.json' }],
    unknowns: ['真实员工数据未提供'],
    risks: ['不得自动执行人事、发薪或外部系统写入'],
    ...overrides,
  };
}

async function setup() {
  const projectRoot = await makeProjectFixture();
  const task = organizationTask({
    taskId: '20260729-003-process-replication',
    parentTaskId: '20260729-003-process-replication',
    idempotencyKey: 'acme-demo|20260729-003-process-replication',
    capabilityId: 'process-replication',
    status: 'approved',
    candidateVersion: 1,
    decisionRef: 'acceptance/decision-v1.json',
  });
  const candidatePath = path.join(
    projectRoot,
    'organizations',
    'ai-organization-officer',
    'tasks',
    'acme-demo',
    task.taskId,
    'candidates',
    'process-replication-v1.json',
  );
  await writeJson(candidatePath, replicationCandidate());
  const candidateSha256 = await sha256File(candidatePath);
  const decision = {
    schemaVersion: 1,
    taskId: task.taskId,
    enterpriseId: task.enterpriseId,
    capabilityId: task.capabilityId,
    candidateVersion: 1,
    candidateSha256,
    decision: 'approve',
    decidedBy: 'enterprise-owner',
    decisionText: '批准该能力完整建设并打通组织链路',
    decidedAt,
    scope: '批准流程复制V1；不包含自动人事决定、对外发布或生产系统写入',
  };
  return { projectRoot, task, candidatePath, candidateSha256, decision };
}

test('通用晋级只把匹配任务、能力、版本、哈希和批准的候选写入正式资产', async () => {
  const fixture = await setup();
  const result = await promoteApprovedOrganizationAsset({
    ...fixture,
    gateResult: { ok: true, failures: [] },
    accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
  });
  assert.match(
    result.formalAssetRef,
    /enterprises\/acme-demo\/assets\/process-replication\/versions\/1\.json/u,
  );
  assert.equal(result.capabilityId, 'process-replication');
  assert.equal(result.status, 'completed');
  assert.equal(result.candidateSha256, fixture.candidateSha256);
  assert.equal(result.approvalRef, 'acceptance/decision-v1.json');
  assert.equal(result.projectIsolationMode, 'legacy-organization-build');
  assert.equal(result.businessProjectId, null);
  assert.equal(result.upstreamAssetBindings.talentAllocation, undefined);

  const current = JSON.parse(await readFile(path.join(
    fixture.projectRoot,
    'organizations',
    'ai-organization-officer',
    'enterprises',
    'acme-demo',
    'assets',
    'process-replication',
    'current.json',
  ), 'utf8'));
  assert.equal(current.version, 1);
  assert.match(current.formalAssetSha256, /^[a-f0-9]{64}$/u);
  await assert.rejects(
    readFile(path.join(fixture.projectRoot, 'outputs', 'result.json')),
    /ENOENT/u,
  );
});

test('通用晋级拒绝门禁失败、哈希漂移、越界候选和缺少正式写权限', async () => {
  const fixture = await setup();
  await assert.rejects(
    promoteApprovedOrganizationAsset({
      ...fixture,
      gateResult: { ok: false, failures: [{ code: 'missing_sop' }] },
      accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
    }),
    /gate failed.*missing_sop/u,
  );
  await assert.rejects(
    promoteApprovedOrganizationAsset({
      ...fixture,
      decision: { ...fixture.decision, candidateSha256: '0'.repeat(64) },
      gateResult: { ok: true, failures: [] },
      accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
    }),
    /hash mismatch/u,
  );
  await assert.rejects(
    promoteApprovedOrganizationAsset({
      ...fixture,
      candidatePath: path.join(fixture.projectRoot, 'candidate.json'),
      gateResult: { ok: true, failures: [] },
      accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
    }),
    /current enterprise task/u,
  );
  await assert.rejects(
    promoteApprovedOrganizationAsset({
      ...fixture,
      gateResult: { ok: true, failures: [] },
      accessEnvelope: accessEnvelope('acme-demo', ['organization.read']),
    }),
    /formal write scope is missing/u,
  );
});

test('正式能力版本不可覆盖', async () => {
  const fixture = await setup();
  const args = {
    ...fixture,
    gateResult: { ok: true, failures: [] },
    accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
  };
  await promoteApprovedOrganizationAsset(args);
  await assert.rejects(
    promoteApprovedOrganizationAsset(args),
    /cannot be overwritten/u,
  );
});
