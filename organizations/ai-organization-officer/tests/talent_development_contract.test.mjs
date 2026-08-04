import assert from 'node:assert/strict';
import test from 'node:test';

import { validateTalentDevelopmentCandidate } from '../scripts/talent_development_contract.mjs';
import { enterpriseProfile, organizationTask } from './helpers.mjs';

const task = organizationTask({
  taskId: '20260728-002-talent-development',
  parentTaskId: '20260728-002-talent-development',
  idempotencyKey: 'acme-demo|20260728-002-talent-development',
  capabilityId: 'talent-development',
  status: 'quality_review',
  knowledgeStatus: 'no_hit',
  candidateVersion: 1,
});

const knowledgeContext = {
  schemaVersion: 1,
  requestId: task.taskId,
  status: 'no_hit',
  sources: [],
  degradedReason: '',
};

const upstreamTalentAsset = {
  schemaVersion: 1,
  enterpriseId: 'acme-demo',
  taskId: '20260728-001-talent-allocation',
  capabilityId: 'talent-allocation',
  version: 1,
  candidateSha256: 'a'.repeat(64),
  asset: {
    jobProfiles: [{ id: 'ai-organization-officer-lead', responsibilities: ['形成组织管理候选'] }],
    talentProfiles: [{ jobId: 'ai-organization-officer-lead', requiredCapabilities: ['组织诊断'] }],
  },
};

function validCandidate(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: task.taskId,
    enterpriseId: 'acme-demo',
    version: 1,
    upstreamTalentAsset: {
      capabilityId: 'talent-allocation',
      version: 1,
      candidateSha256: 'a'.repeat(64),
      roleId: 'ai-organization-officer-lead',
    },
    developmentDiagnosis: {
      trainingNeeded: true,
      targetRoleId: 'ai-organization-officer-lead',
      rootCauseAnalysis: {
        capability: ['需要通过实战证明组织诊断与门禁能力'],
        management: [],
        process: [],
        resource: [],
        motivation: [],
      },
      trainingJustification: '岗位标准已批准，但尚需建立可观察训练和上岗认证。',
      evidenceRefs: ['evidence/knowledge_context.json', 'upstream/talent-allocation-v1'],
    },
    learnerScope: {
      type: 'digital-role',
      roleId: 'ai-organization-officer-lead',
      personRefs: [],
      note: '验证数字岗位培养体系，不虚构员工成绩。',
    },
    capabilityModel: [{
      id: 'organization-diagnosis',
      name: '组织诊断',
      targetLevel: 'independent',
      observableBehaviors: ['能区分岗位、资源、流程、管理和个人问题'],
      evidenceRequired: ['完成匿名业务案例诊断并通过质量门禁'],
    }],
    objectives: ['能够独立完成一项人才配置候选并守住使用者决策边界'],
    modules: [{
      id: 'module-01',
      title: '企业与权限识别',
      objective: '准确绑定企业、任务和字段权限',
      materials: ['AGENTS.md', '已批准岗位标准'],
      demonstration: '示范一次企业隔离检查',
      practice: '识别两企业资料混用风险',
      workTask: '建立一份隔离的组织任务',
      commonErrors: ['把跨企业资料当作通用模板'],
      assessmentCriteria: ['企业、任务和权限全部匹配'],
    }],
    supportPlan: {
      mentorRole: 'enterprise-owner-or-authorized-manager',
      feedbackCadence: '每个实战任务结束后',
      resources: ['正式人才配置Skill', '组织Workflow与门禁'],
    },
    assessmentPlan: {
      methods: ['实操任务', '证据复核'],
      evidenceRequired: ['候选文件', '门禁结果', '复盘记录'],
      passRule: '全部硬门禁通过且关键能力证据完整',
      noPermanentLabel: true,
      decisionBoundary: '认证结果仅供使用者最终决定，不自动触发转正、晋升、降级、处罚或辞退。',
    },
    certification: {
      status: 'candidate',
      threshold: '全部硬门禁通过且实战总评达到80分',
      approver: 'enterprise-owner',
      retrainingConditions: ['出现跨企业读取', '同类门禁连续两次失败'],
    },
    growthPath: {
      currentLevel: 'guided',
      targetLevel: 'independent',
      milestones: ['完成训练', '完成模拟', '完成真实任务'],
      alternativePaths: ['组织资料治理专长路径'],
    },
    operations: {
      metrics: ['训练完成率', '实战门禁通过率', '返工原因闭环率'],
      reviewCycle: '每个真实任务后复盘',
      staleContentRule: '上游岗位标准变化时重新验证',
    },
    evidenceIndex: [{
      ref: 'evidence/knowledge_context.json',
      type: 'internal-knowledge-preflight',
      factClass: 'knowledge-result',
    }],
    unknowns: ['尚无真实学员成绩'],
    risks: ['不得把数字岗位训练结果解释为真实员工评价'],
    decisionsRequired: [{
      decision: '是否批准该培养体系进入小范围试运行',
      owner: 'enterprise-owner',
      executed: false,
    }],
    downstreamBrief: {
      processReplication: {
        needs: ['将通过验证的训练任务沉淀为SOP和检查表'],
      },
    },
    createdAt: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}

test('完整人才培养候选绑定批准岗位、训练实战、评估认证和下游流程', () => {
  const result = validateTalentDevelopmentCandidate({
    candidate: validCandidate(),
    task,
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext,
    upstreamTalentAsset,
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('拒绝没有批准岗位、没有实战评分或把所有问题归因于能力', () => {
  const candidate = validCandidate();
  candidate.upstreamTalentAsset.candidateSha256 = 'b'.repeat(64);
  candidate.developmentDiagnosis.rootCauseAnalysis = {
    capability: ['都是员工不会'],
    management: [],
    process: [],
    resource: [],
    motivation: [],
  };
  candidate.developmentDiagnosis.trainingJustification = '所有问题都靠培训解决';
  candidate.modules[0].workTask = '';
  candidate.modules[0].assessmentCriteria = [];
  const result = validateTalentDevelopmentCandidate({
    candidate,
    task,
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext,
    upstreamTalentAsset,
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'upstream_talent_asset_mismatch'));
  assert.ok(result.failures.some((item) => item.code === 'training_root_cause_overreach'));
  assert.ok(result.failures.some((item) => item.code === 'module_practice_incomplete'));
});

test('拒绝单次考试永久定性和自动人员处理', () => {
  const candidate = validCandidate();
  candidate.assessmentPlan.methods = ['单次考试'];
  candidate.assessmentPlan.noPermanentLabel = false;
  candidate.assessmentPlan.decisionBoundary = '考试不合格自动辞退';
  const result = validateTalentDevelopmentCandidate({
    candidate,
    task,
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext,
    upstreamTalentAsset,
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'single_assessment_permanent_label'));
  assert.ok(result.failures.some((item) => item.code === 'automated_personnel_decision'));
});

test('即使同时写有使用者最终决定也拒绝直接淘汰、解雇或解除劳动关系', () => {
  for (const action of ['直接淘汰', '立即解雇', '系统解除劳动合同']) {
    const candidate = validCandidate();
    candidate.assessmentPlan.decisionBoundary = `结果提交使用者最终决定，低于80分${action}`;
    const result = validateTalentDevelopmentCandidate({
      candidate,
      task,
      enterpriseProfile: enterpriseProfile(),
      knowledgeContext,
      upstreamTalentAsset,
    });
    assert.equal(result.ok, false, action);
    assert.ok(result.failures.some((item) => item.code === 'automated_personnel_decision'));
  }
});

test('拒绝企业任务、知识凭证或流程复制下游简报缺失', () => {
  const candidate = validCandidate({ enterpriseId: 'beta-demo', downstreamBrief: {} });
  const result = validateTalentDevelopmentCandidate({
    candidate,
    task,
    enterpriseProfile: enterpriseProfile(),
    knowledgeContext: { ...knowledgeContext, status: 'pending' },
    upstreamTalentAsset,
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'enterprise_task_mismatch'));
  assert.ok(result.failures.some((item) => item.code === 'knowledge_preflight_incomplete'));
  assert.ok(result.failures.some((item) => item.code === 'process_replication_brief_missing'));
});
