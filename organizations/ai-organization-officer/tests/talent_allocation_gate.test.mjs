import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  checkBeforeDiagnosis,
  checkCandidate,
  promoteApprovedCandidate,
} from '../scripts/talent_allocation_gate.mjs';
import { sha256File } from '../../../scripts/feishu-commander/atomic_store.mjs';
import {
  accessEnvelope,
  enterpriseProfile,
  makeProjectFixture,
  organizationTask,
  validCandidate,
  writeJson,
} from './helpers.mjs';

const knowledge = {
  requestId: '20260728-001-talent-allocation',
  capabilityId: 'ai-organization-officer.talent-allocation',
  status: 'no_hit',
  sources: [],
};

test('诊断前门禁要求企业、权限和完成的知识状态', () => {
  assert.equal(checkBeforeDiagnosis({
    task: organizationTask({ knowledgeStatus: 'no_hit' }),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: knowledge,
  }).ok, true);
  assert.equal(checkBeforeDiagnosis({
    task: organizationTask(),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: null,
  }).ok, false);
  assert.equal(checkBeforeDiagnosis({
    task: organizationTask({ knowledgeStatus: 'degraded' }),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: { ...knowledge, status: 'degraded' },
  }).ok, false, 'degraded必须保留原因');
});

test('候选门禁复用契约并拒绝缺失当前公开来源字段', () => {
  const valid = checkCandidate({
    candidate: validCandidate(),
    task: organizationTask({ knowledgeStatus: 'no_hit' }),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: knowledge,
  });
  assert.equal(valid.ok, true, JSON.stringify(valid.failures));

  const invalid = checkCandidate({
    candidate: validCandidate({
      compensationDesign: {
        status: 'market-range-recommended',
        region: '杭州市',
        asOfDate: '2026-07-28',
        sourceRefs: [{ publisher: '', url: '', accessedAt: '' }],
      },
    }),
    task: organizationTask({ knowledgeStatus: 'no_hit' }),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: knowledge,
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.failures.some((item) => item.code === 'public_source_incomplete'));
});

test('只有匹配的使用者批准和候选哈希才能晋级正式企业资产', async () => {
  const projectRoot = await makeProjectFixture();
  const task = organizationTask({
    status: 'approved',
    knowledgeStatus: 'no_hit',
    candidateVersion: 1,
  });
  const candidate = validCandidate();
  const candidatePath = path.join(
    projectRoot,
    'organizations',
    'ai-organization-officer',
    'tasks',
    'acme-demo',
    task.taskId,
    'candidates',
    'talent-allocation-v1.json',
  );
  await writeJson(candidatePath, candidate);
  const digest = await sha256File(candidatePath);
  const decision = {
    schemaVersion: 1,
    taskId: task.taskId,
    enterpriseId: 'acme-demo',
    candidateVersion: 1,
    candidateSha256: digest,
    decision: 'approve',
    decidedBy: 'enterprise-owner',
    decisionText: '确认采用该人才配置方案',
    decidedAt: '2026-07-28T00:00:00.000Z',
    scope: '组织、岗位、招聘与绩效候选，不包含自动人事执行',
  };
  const result = await promoteApprovedCandidate({
    projectRoot,
    task,
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: knowledge,
    candidatePath,
    decision,
    accessEnvelope: accessEnvelope('acme-demo', [
      'organization.read',
      'organization.formal.write',
    ]),
  });
  assert.match(result.formalAssetRef, /enterprises\/acme-demo\/assets\/talent-allocation\/versions\/1\.json/u);
  assert.equal(result.status, 'completed');
  await assert.rejects(
    readFile(path.join(projectRoot, 'outputs', 'result.json')),
    /ENOENT/u,
  );

  await writeFile(candidatePath, `${JSON.stringify({ ...candidate, version: 2 })}\n`, 'utf8');
  await assert.rejects(
    promoteApprovedCandidate({
      projectRoot,
      task,
      enterpriseProfile: enterpriseProfile(),
      knowledgeContext: knowledge,
      candidatePath,
      decision,
      accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
    }),
    /hash.*mismatch/u,
  );
});

test('拒绝revise、reject和跨企业决策晋级', async () => {
  const projectRoot = await makeProjectFixture();
  const candidatePath = path.join(projectRoot, 'candidate.json');
  await writeJson(candidatePath, validCandidate());
  const digest = await sha256File(candidatePath);
  for (const decision of ['revise', 'reject']) {
    await assert.rejects(
      promoteApprovedCandidate({
        projectRoot,
        task: organizationTask({ status: 'approved', knowledgeStatus: 'no_hit' }),
        enterpriseProfile: enterpriseProfile(),
        knowledgeContext: knowledge,
        candidatePath,
        decision: {
          schemaVersion: 1,
          taskId: '20260728-001-talent-allocation',
          enterpriseId: 'acme-demo',
          candidateVersion: 1,
          candidateSha256: digest,
          decision,
          decidedBy: 'enterprise-owner',
          decisionText: '需要调整',
          decidedAt: '2026-07-28T00:00:00.000Z',
          scope: '候选',
        },
        accessEnvelope: accessEnvelope('acme-demo', ['organization.formal.write']),
      }),
      /approval required/u,
    );
  }
});
