import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSkillHandoff,
  createUpstreamChangeRequest,
} from '../scripts/organization_handoff_engine.mjs';
import { createOrganizationReturnPackage } from '../scripts/organization_return_engine.mjs';

const hash = 'a'.repeat(64);

test('跨Skill交接要求精确版本并拒绝current或latest', () => {
  const input = {
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
    fromSkill: 'talent-allocation',
    toSkill: 'talent-development',
    bindings: [{
      artifactId: 'talent-allocation',
      version: 2,
      sha256: hash,
      sourceRef: 'assets/talent-allocation/versions/2.json',
    }],
    payload: { capabilityModel: ['销售管理'] },
  };
  const result = createSkillHandoff(input);
  assert.equal(result.bindings[0].version, 2);
  assert.throws(() => createSkillHandoff({
    ...input,
    bindings: [{ ...input.bindings[0], sourceRef: 'assets/talent-allocation/current.json' }],
  }), /current|latest|exact/u);
});

test('下游问题生成上游变更请求而不静默修改', () => {
  const request = createUpstreamChangeRequest({
    execution: {
      enterpriseId: 'acme-demo',
      businessProjectId: '20260729-101-org-build-001',
      taskId: '20260729-101-org-v2-runtime',
      primarySkill: 'talent-development',
      currentStageId: 'real-work',
    },
    targetSkill: 'talent-allocation',
    problem: '岗位成果标准无法用于训练验收',
    evidence: ['quality-report.json#skill'],
    impact: ['人才培养暂停'],
    currentBinding: { artifactId: 'talent-allocation', version: 2, sha256: hash },
    recommendedChange: ['补充可观察质量标准'],
  });
  assert.equal(request.status, 'requested_to_control_center');
  assert.equal(request.currentBinding.version, 2);
});

test('完成回传要求质量通过且待决定回传保留使用者权力', () => {
  const execution = {
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
  };
  assert.throws(() => createOrganizationReturnPackage({
    execution,
    status: 'completed',
    artifacts: [],
    quality: { ok: false },
    decisions: [],
    nextAction: 'none',
  }), /quality/u);
  const result = createOrganizationReturnPackage({
    execution,
    status: 'needs_decision',
    artifacts: [],
    quality: { ok: false, failures: ['decisionBoundaryReady'] },
    decisions: [{ decision: '是否录用候选人', owner: 'enterprise-owner', executed: false }],
    nextAction: 'wait-user-decision',
  });
  assert.equal(result.status, 'needs_decision');
});
