import assert from 'node:assert/strict';
import test from 'node:test';

import { validateTalentAllocationCandidate } from '../scripts/talent_allocation_contract.mjs';
import {
  enterpriseProfile,
  organizationTask,
  validCandidate,
} from './helpers.mjs';

const knowledgeContext = {
  requestId: '20260728-001-talent-allocation',
  capabilityId: 'ai-organization-officer.talent-allocation',
  status: 'no_hit',
  sources: [],
};

function validate(candidate) {
  return validateTalentAllocationCandidate({
    candidate,
    task: organizationTask({ knowledgeStatus: 'no_hit' }),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext,
  });
}

test('完整人才配置候选包含岗位、人才、招聘、证据和下游简报', () => {
  const result = validate(validCandidate());
  assert.equal(result.ok, true, JSON.stringify(result.failures));
  assert.deepEqual(result.failures, []);
});

test('拒绝空泛岗位职责、歧视条件和只给总分的人岗匹配', () => {
  const candidate = validCandidate({
    jobProfiles: [{
      ...validCandidate().jobProfiles[0],
      responsibilities: ['完成领导交办的其他工作'],
    }],
    talentProfiles: [{
      ...validCandidate().talentProfiles[0],
      requiredCapabilities: ['限男性', '未婚未育', '年轻人'],
    }],
    personJobMatches: [{
      personRef: 'candidate-anonymous-1',
      jobId: 'sales-lead',
      overallScore: 90,
    }],
  });
  const result = validate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'job_responsibility_too_vague'));
  assert.ok(result.failures.some((item) => item.code === 'discriminatory_criterion'));
  assert.ok(result.failures.some((item) => item.code === 'person_job_match_missing_evidence'));
  assert.deepEqual(
    result.failures,
    [...result.failures].sort(
      (a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code),
    ),
  );
});

test('拒绝把一次绩效变成辞退结论和把AI建议写成已执行', () => {
  const result = validate(validCandidate({
    adjustmentRecommendations: [{
      recommendation: '因本月绩效不达标立即辞退',
      status: 'executed',
      requiresUserDecision: false,
    }],
  }));
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'automatic_adverse_employment_action'));
});

test('拒绝企业任务不匹配、缺少知识凭证和下游简报', () => {
  const noKnowledge = validateTalentAllocationCandidate({
    candidate: validCandidate({ enterpriseId: 'beta-demo', downstreamBrief: {} }),
    task: organizationTask({ knowledgeStatus: 'pending' }),
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: null,
  });
  assert.equal(noKnowledge.ok, false);
  assert.ok(noKnowledge.failures.some((item) => item.code === 'enterprise_mismatch'));
  assert.ok(noKnowledge.failures.some((item) => item.code === 'knowledge_preflight_missing'));
  assert.ok(noKnowledge.failures.some((item) => item.code === 'downstream_brief_missing'));
});
