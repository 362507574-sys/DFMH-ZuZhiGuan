import { enterpriseProfile, organizationTask } from './helpers.mjs';

export function developmentTask(overrides = {}) {
  return organizationTask({
    taskId: '20260728-002-talent-development',
    parentTaskId: '20260728-002-talent-development',
    idempotencyKey: 'acme-demo|20260728-002-talent-development',
    capabilityId: 'talent-development',
    status: 'quality_review',
    knowledgeStatus: 'no_hit',
    candidateVersion: 1,
    ...overrides,
  });
}

export function developmentKnowledge(overrides = {}) {
  return {
    schemaVersion: 1,
    requestId: '20260728-002-talent-development',
    status: 'no_hit',
    sources: [],
    degradedReason: '',
    ...overrides,
  };
}

export function upstreamTalentAsset(overrides = {}) {
  return {
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
    ...overrides,
  };
}

export function developmentCandidate(overrides = {}) {
  const task = developmentTask();
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
        capability: ['需要用实战证明岗位能力'],
        management: [],
        process: [],
        resource: [],
        motivation: [],
      },
      trainingJustification: '岗位标准已批准，需要建立可观察训练与认证。',
      evidenceRefs: ['evidence/knowledge_context.json'],
    },
    learnerScope: {
      type: 'digital-role',
      roleId: 'ai-organization-officer-lead',
      personRefs: [],
    },
    capabilityModel: [{
      id: 'organization-diagnosis',
      name: '组织诊断',
      targetLevel: 'independent',
      observableBehaviors: ['区分岗位、资源、流程、管理和个人问题'],
      evidenceRequired: ['完成真实案例并通过门禁'],
    }],
    objectives: ['独立完成人才配置候选'],
    modules: [{
      id: 'module-01',
      title: '企业与权限识别',
      objective: '绑定企业、任务和权限',
      materials: ['AGENTS.md'],
      demonstration: '示范企业隔离检查',
      practice: '识别混用风险',
      workTask: '建立隔离任务',
      commonErrors: ['跨企业复用'],
      assessmentCriteria: ['身份与权限一致'],
    }],
    supportPlan: {
      mentorRole: 'enterprise-owner',
      feedbackCadence: '每个任务后',
      resources: ['人才配置Skill'],
    },
    assessmentPlan: {
      methods: ['实操任务', '证据复核'],
      evidenceRequired: ['候选', '门禁结果'],
      passRule: '全部硬门禁通过',
      noPermanentLabel: true,
      decisionBoundary: '仅供使用者最终决定，不自动触发转正、晋升、降级、处罚或辞退。',
    },
    certification: {
      status: 'candidate',
      threshold: '硬门禁全部通过',
      approver: 'enterprise-owner',
      retrainingConditions: ['发生越权', '同类错误重复'],
    },
    growthPath: {
      currentLevel: 'guided',
      targetLevel: 'independent',
      milestones: ['训练', '模拟', '真实任务'],
      alternativePaths: ['资料治理专长'],
    },
    operations: {
      metrics: ['实战门禁通过率'],
      reviewCycle: '每个任务后',
      staleContentRule: '上游岗位变化时复核',
    },
    evidenceIndex: [{ ref: 'evidence/knowledge_context.json', type: 'knowledge', factClass: 'knowledge-result' }],
    unknowns: ['尚无真实学员成绩'],
    risks: ['不得冒充真实员工评价'],
    decisionsRequired: [{
      decision: '是否进入小范围试运行',
      owner: 'enterprise-owner',
      executed: false,
    }],
    downstreamBrief: {
      processReplication: { needs: ['沉淀训练SOP'] },
    },
    createdAt: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}

export function developmentEnterprise() {
  return enterpriseProfile();
}
