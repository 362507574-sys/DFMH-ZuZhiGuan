import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  createCollaborationRequest,
  receiveCollaborationResult,
  validateCollaborationResult,
  writeCollaborationRequest,
} from '../scripts/collaboration_contract.mjs';
import { sha256File } from '../../../scripts/feishu-commander/atomic_store.mjs';
import { accessEnvelope, makeProjectFixture, writeJson } from './helpers.mjs';

function request(overrides = {}) {
  return {
    schemaVersion: 1,
    contractVersion: 1,
    parentTaskId: '20260728-001-talent-allocation',
    requestId: 'collab-20260728-001',
    enterpriseId: 'acme-demo',
    primaryOrganization: 'ai-organization-officer',
    requestingOrganization: 'ai-organization-officer',
    targetOrganization: 'ai-deal-officer',
    requestedCapability: 'sales-role-method-evidence',
    scope: '提供销售负责人岗位所需的销售专业能力和真实证据边界',
    inputRefs: [],
    accessEnvelope: accessEnvelope('acme-demo', ['organization.read']),
    expectedDeliverables: ['销售专业能力清单', '证据和未知项'],
    constraints: {
      maxDelegationDepth: 1,
      forbiddenActions: ['external_publish', 'permission_change'],
      expiresAt: '2099-08-04T00:00:00.000Z',
    },
    evidenceRequirements: ['source', 'version', 'sha256', 'generatedAt', 'scope'],
    status: 'requested',
    recursionDepth: 1,
    createdAt: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}

test('协作请求保持唯一主责、单层转派和缩小权限', () => {
  const valid = createCollaborationRequest(request());
  assert.equal(valid.primaryOrganization, 'ai-organization-officer');
  assert.ok(Object.isFrozen(valid));
  assert.throws(
    () => createCollaborationRequest(request({ targetOrganization: 'ai-organization-officer' })),
    /self-call/u,
  );
  assert.throws(
    () => createCollaborationRequest(request({ recursionDepth: 2 })),
    /delegation depth/u,
  );
  assert.throws(
    () => createCollaborationRequest(request({ scope: '全部处理' })),
    /bounded scope/u,
  );
});

test('协作结果必须匹配请求身份、企业、能力和成果哈希', async () => {
  const projectRoot = await makeProjectFixture();
  const artifactPath = path.join(projectRoot, 'artifact.json');
  await writeFile(artifactPath, '{"skills":["销售管理"]}\n', 'utf8');
  const digest = await sha256File(artifactPath);
  const value = {
    schemaVersion: 1,
    contractVersion: 1,
    parentTaskId: '20260728-001-talent-allocation',
    requestId: 'collab-20260728-001',
    enterpriseId: 'acme-demo',
    primaryOrganization: 'ai-organization-officer',
    respondingOrganization: 'ai-deal-officer',
    requestedCapability: 'sales-role-method-evidence',
    status: 'completed',
    artifacts: [{
      path: artifactPath,
      version: 1,
      sha256: digest,
      purpose: '销售能力依据',
      generatedAt: '2026-07-28T00:00:00.000Z',
    }],
    evidence: [{ source: 'artifact', scope: 'sales-role' }],
    assumptions: [],
    risks: [],
    unresolvedItems: [],
    completedAt: '2026-07-28T00:00:00.000Z',
  };
  assert.equal((await validateCollaborationResult({ request: request(), result: value })).ok, true);
  await assert.rejects(
    validateCollaborationResult({
      request: request(),
      result: { ...value, enterpriseId: 'beta-demo' },
    }),
    /enterprise.*mismatch/u,
  );
  await assert.rejects(
    validateCollaborationResult({
      request: request(),
      result: {
        ...value,
        artifacts: [{ ...value.artifacts[0], sha256: '0'.repeat(64) }],
      },
    }),
    /hash.*mismatch/u,
  );
});

test('协作请求和结果只保存在当前任务协作目录', async () => {
  const projectRoot = await makeProjectFixture();
  const validRequest = request();
  const requestPath = await writeCollaborationRequest({
    projectRoot,
    request: validRequest,
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  assert.match(requestPath, /collaboration[\\/]requests/u);

  const artifactPath = path.join(projectRoot, 'artifact.json');
  await writeJson(artifactPath, { skills: ['销售管理'] });
  const result = {
    schemaVersion: 1,
    contractVersion: 1,
    parentTaskId: validRequest.parentTaskId,
    requestId: validRequest.requestId,
    enterpriseId: validRequest.enterpriseId,
    primaryOrganization: validRequest.primaryOrganization,
    respondingOrganization: validRequest.targetOrganization,
    requestedCapability: validRequest.requestedCapability,
    status: 'completed',
    artifacts: [{
      path: artifactPath,
      version: 1,
      sha256: await sha256File(artifactPath),
      purpose: '销售能力依据',
      generatedAt: '2026-07-28T00:00:00.000Z',
    }],
    evidence: [{ source: 'artifact', scope: 'sales-role' }],
    assumptions: [],
    risks: [],
    unresolvedItems: [],
    completedAt: '2026-07-28T00:00:00.000Z',
  };
  const resultPath = await receiveCollaborationResult({
    projectRoot,
    request: validRequest,
    result,
    accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
  });
  assert.match(resultPath, /collaboration[\\/]results/u);
});
