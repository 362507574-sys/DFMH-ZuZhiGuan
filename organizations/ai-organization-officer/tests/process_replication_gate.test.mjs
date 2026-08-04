import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkBeforeProcessDiagnosis,
  checkProcessReplicationCandidate,
} from '../scripts/process_replication_gate.mjs';
import {
  replicationCandidate,
  replicationEnterprise,
  replicationKnowledge,
  replicationTask,
  upstreamAllocationAsset,
  upstreamDevelopmentAsset,
} from './process_replication_fixtures.mjs';

test('流程诊断前要求企业权限、知识前置和两个上游正式资产', () => {
  const result = checkBeforeProcessDiagnosis({
    task: replicationTask({ status: 'diagnosing' }),
    enterpriseProfile: replicationEnterprise(),
    knowledgeContext: replicationKnowledge(),
    upstreamTalentAsset: upstreamAllocationAsset(),
    upstreamDevelopmentAsset: upstreamDevelopmentAsset(),
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('流程诊断前拒绝错误权限、待检索知识和错误上游能力', () => {
  const task = replicationTask({
    status: 'diagnosing',
    knowledgeStatus: 'pending',
    accessEnvelope: {
      enterpriseId: 'acme-demo',
      allowedScopes: ['organization.read'],
      deniedScopes: [],
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
  });
  const result = checkBeforeProcessDiagnosis({
    task,
    enterpriseProfile: replicationEnterprise(),
    knowledgeContext: replicationKnowledge({ status: 'pending' }),
    upstreamTalentAsset: upstreamAllocationAsset({ capabilityId: 'talent-development' }),
    upstreamDevelopmentAsset: upstreamDevelopmentAsset({ enterpriseId: 'beta-demo' }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'access_scope_missing'));
  assert.ok(result.failures.some((item) => item.code === 'knowledge_preflight_incomplete'));
  assert.ok(result.failures.some((item) => item.code === 'approved_upstream_assets_missing'));
});

test('完整流程复制候选通过统一门禁', () => {
  const result = checkProcessReplicationCandidate({
    candidate: replicationCandidate(),
    task: replicationTask(),
    enterpriseProfile: replicationEnterprise(),
    knowledgeContext: replicationKnowledge(),
    upstreamTalentAsset: upstreamAllocationAsset(),
    upstreamDevelopmentAsset: upstreamDevelopmentAsset(),
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});
