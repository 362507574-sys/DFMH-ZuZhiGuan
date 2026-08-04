import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkBeforeDevelopmentDiagnosis,
  checkDevelopmentCandidate,
} from '../scripts/talent_development_gate.mjs';
import {
  developmentCandidate,
  developmentEnterprise,
  developmentKnowledge,
  developmentTask,
  upstreamTalentAsset,
} from './talent_development_fixtures.mjs';

test('培养诊断前要求同企业权限、知识前置和已批准岗位资产', () => {
  const result = checkBeforeDevelopmentDiagnosis({
    task: developmentTask({ status: 'diagnosing' }),
    enterpriseProfile: developmentEnterprise(),
    knowledgeContext: developmentKnowledge(),
    upstreamTalentAsset: upstreamTalentAsset(),
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('培养诊断前拒绝缺失权限、待检索知识或错误上游能力', () => {
  const task = developmentTask({
    status: 'diagnosing',
    knowledgeStatus: 'pending',
    accessEnvelope: {
      enterpriseId: 'acme-demo',
      allowedScopes: ['organization.read'],
      deniedScopes: [],
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
  });
  const result = checkBeforeDevelopmentDiagnosis({
    task,
    enterpriseProfile: developmentEnterprise(),
    knowledgeContext: developmentKnowledge({ status: 'pending' }),
    upstreamTalentAsset: upstreamTalentAsset({ capabilityId: 'talent-development' }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'access_scope_missing'));
  assert.ok(result.failures.some((item) => item.code === 'knowledge_preflight_incomplete'));
  assert.ok(result.failures.some((item) => item.code === 'approved_talent_asset_missing'));
});

test('完整培养候选通过门禁且敏感员工资料不会被默认要求', () => {
  const result = checkDevelopmentCandidate({
    candidate: developmentCandidate(),
    task: developmentTask(),
    enterpriseProfile: developmentEnterprise(),
    knowledgeContext: developmentKnowledge(),
    upstreamTalentAsset: upstreamTalentAsset(),
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('候选门禁拒绝跨企业、越权和自动人员决定', () => {
  const candidate = developmentCandidate({ enterpriseId: 'beta-demo' });
  candidate.assessmentPlan.decisionBoundary = '考试不合格自动辞退';
  const result = checkDevelopmentCandidate({
    candidate,
    task: developmentTask({
      accessEnvelope: {
        enterpriseId: 'acme-demo',
        allowedScopes: ['organization.read', 'organization.draft.write'],
        deniedScopes: ['staff.performance.read'],
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    }),
    enterpriseProfile: developmentEnterprise(),
    knowledgeContext: developmentKnowledge(),
    upstreamTalentAsset: upstreamTalentAsset(),
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'enterprise_task_mismatch'));
  assert.ok(result.failures.some((item) => item.code === 'automated_personnel_decision'));
});
