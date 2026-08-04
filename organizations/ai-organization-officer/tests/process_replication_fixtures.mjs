import { enterpriseProfile, organizationTask } from './helpers.mjs';

export function replicationTask(overrides = {}) {
  return organizationTask({
    taskId: '20260729-003-process-replication',
    parentTaskId: '20260729-003-process-replication',
    idempotencyKey: 'acme-demo|20260729-003-process-replication',
    capabilityId: 'process-replication',
    status: 'quality_review',
    knowledgeStatus: 'no_hit',
    candidateVersion: 1,
    ...overrides,
  });
}

export function replicationKnowledge(overrides = {}) {
  return {
    schemaVersion: 1,
    requestId: '20260729-003-process-replication',
    status: 'no_hit',
    sources: [],
    degradedReason: '',
    ...overrides,
  };
}

export function upstreamAllocationAsset(overrides = {}) {
  return {
    schemaVersion: 1,
    enterpriseId: 'acme-demo',
    taskId: '20260728-001-talent-allocation',
    capabilityId: 'talent-allocation',
    version: 1,
    candidateSha256: 'a'.repeat(64),
    formalAssetSha256: 'b'.repeat(64),
    asset: { jobProfiles: [{ id: 'organization-lead' }] },
    ...overrides,
  };
}

export function upstreamDevelopmentAsset(overrides = {}) {
  return {
    schemaVersion: 1,
    enterpriseId: 'acme-demo',
    taskId: '20260728-002-talent-development',
    capabilityId: 'talent-development',
    version: 1,
    candidateSha256: 'c'.repeat(64),
    formalAssetSha256: 'd'.repeat(64),
    asset: { modules: [{ id: 'module-01' }] },
    ...overrides,
  };
}

export function replicationEnterprise() {
  return enterpriseProfile();
}

export function replicationCandidate(overrides = {}) {
  const task = replicationTask();
  return {
    schemaVersion: 1,
    taskId: task.taskId,
    enterpriseId: 'acme-demo',
    version: 1,
    upstreamAssets: {
      talentAllocation: {
        capabilityId: 'talent-allocation',
        version: 1,
        candidateSha256: 'a'.repeat(64),
        formalAssetSha256: 'b'.repeat(64),
        formalAssetRef: 'enterprises/acme-demo/assets/talent-allocation/versions/1.json',
      },
      talentDevelopment: {
        capabilityId: 'talent-development',
        version: 1,
        candidateSha256: 'c'.repeat(64),
        formalAssetSha256: 'd'.repeat(64),
        formalAssetRef: 'enterprises/acme-demo/assets/talent-development/versions/1.json',
      },
    },
    processDiagnosis: {
      targetSystem: 'AI组织官三技能闭环',
      objective: '让三个核心技能形成可恢复、可审计、可复制的正式链路',
      sourceScope: '当前企业AI组织官模块',
      actualEvidenceRefs: ['tests/talent_allocation_gate.test.mjs', 'tests/talent_development_gate.test.mjs'],
      writtenVsActual: ['设计文件已完整，流程复制执行链尚未固化'],
      gaps: ['缺少流程复制正式契约和链路清单'],
    },
    processMap: {
      trigger: '收到组织建设任务',
      inputs: ['企业上下文', '上游正式资产'],
      participants: ['控制中心', 'AI组织官', '使用者'],
      steps: [{
        id: 'step-01',
        action: '绑定企业、任务、权限和上游版本',
        owner: 'AI组织官',
        collaborators: ['控制中心'],
        reviewer: '使用者',
        tools: ['组织任务状态机'],
        outputs: ['任务上下文'],
        timeLimit: '同一任务开始时',
        qualityStandard: '企业、任务、版本和哈希一致',
      }],
      waits: ['等待使用者高影响决策'],
      errorPoints: ['跨企业或哈希漂移'],
      exceptions: ['知识服务降级时保存凭证后继续'],
    },
    responsibilityMatrix: [{
      activity: '正式资产批准',
      owner: '使用者',
      collaborators: ['AI组织官'],
      reviewer: '控制中心',
      escalation: '批准信息不完整时停止晋级',
    }],
    sops: [{
      id: 'sop-organization-capability',
      purpose: '稳定执行组织能力任务',
      scope: 'AI组织官三个核心技能',
      preconditions: ['企业与任务已绑定'],
      materials: ['组织规则', '上游正式资产'],
      steps: ['知识前置', '诊断', '候选', '门禁', '使用者决定', '正式归档'],
      examples: ['人才配置到人才培养再到流程复制'],
      qualityStandards: ['全部硬门禁通过'],
      commonErrors: ['把候选当正式结果'],
      exceptions: ['知识无命中时保留凭证继续'],
      checklist: ['版本', '哈希', '权限', '批准'],
      owner: 'AI组织官',
      version: '1.0.0',
      effectiveDate: '2026-07-29',
      updateConditions: ['上游契约变化', '真实任务暴露新异常'],
    }],
    formsAndApprovals: {
      forms: ['任务表', '候选表', '决策表', '回传包'],
      approvalSteps: ['候选门禁', '使用者决定', '正式写入'],
      auditTrail: ['原话', '时间', '范围', '候选SHA-256'],
    },
    knowledgeBase: {
      structure: ['规则', '流程', 'Skill', '案例', '异常'],
      entries: [{
        id: 'kb-001',
        enterpriseId: 'acme-demo',
        department: 'AI组织官',
        owner: 'AI组织官',
        sourceRef: 'AGENTS.md',
        audience: ['控制中心'],
        permissions: ['organization.read'],
        version: '1.0.0',
        effectiveDate: '2026-07-29',
        reviewCycle: 'monthly',
        relatedRefs: ['WORKFLOWS.md'],
        replaces: null,
      }],
      staleContentRule: '上游规则变化时停止受影响流程并重新验证',
    },
    attendanceSystem: {
      mode: 'template-only',
      applicability: '当前数字组织不涉及真实员工考勤',
      rules: ['真实任务必须绑定适用地区、周期和现行制度'],
      dataSources: ['排班', '打卡', '请假', '加班审批'],
      validation: ['异常记录由获授权人员确认'],
      decisionBoundary: 'AI只计算和提示异常，是否认定出勤、奖惩或处罚由使用者最终决定',
      pilot: {
        fullCycleCovered: false,
        unresolvedExceptions: [],
      },
    },
    payrollSystem: {
      mode: 'template-only',
      applicability: '当前数字组织不涉及真实工资发放',
      region: 'unknown',
      cycle: 'unknown',
      currentPolicyAsOf: null,
      inputs: ['合同薪资', '考勤结果', '奖金扣款', '社保公积金', '个税'],
      formulas: ['应发-合法扣减-个税-个人社保公积金=实发'],
      validation: ['合同、考勤、工资表、银行付款和账务勾稽'],
      separationOfDuties: ['制表', '复核', '批准'],
      employeeConfirmation: '正式任务需提供工资明细和异议渠道',
      disputeProcess: '冻结争议项，人工复核并保留更正记录',
      decisionBoundary: 'AI不发薪、不改工资、不提交银行或税务文件，由获授权使用者最终决定',
      shadowRun: {
        completed: false,
        unexplainedDifferences: [],
      },
    },
    employeeLifecycle: {
      stages: ['招聘', '入职', '试用', '转正', '调动', '发展', '离职'],
      handoffs: ['岗位标准', '合同资料', '权限', '培训', '资产交接'],
      decisionBoundary: '高影响人员决定由使用者完成',
    },
    laborCompliance: {
      currentResearchRequired: true,
      requiredDimensions: ['地区', '用工主体', '员工类型', '生效日期'],
      professionalReviewRequired: true,
      legalAdviceProvided: false,
      sourceStandard: '真实任务优先采用当前官方来源并保留访问日期',
    },
    replicationPackage: {
      conditions: ['目标与边界明确', '上游资产已批准'],
      organizationModel: ['职责', '汇报', '决策权'],
      staffing: ['岗位', '编制', '人才标准'],
      recruiting: ['招聘', '面试', '试用'],
      onboarding: ['入职', '训练', '认证'],
      management: ['目标', '反馈', '绩效参考'],
      sopRefs: ['sop-organization-capability'],
      formRefs: ['任务表', '候选表', '决策表'],
      knowledgeRefs: ['kb-001'],
      tools: ['组织任务状态机'],
      qualityControls: ['企业隔离', '门禁', '批准哈希'],
      launchConditions: ['试点通过', '使用者批准'],
    },
    pilotPlan: {
      required: true,
      scope: '三技能链路本地真实执行',
      scenarios: ['正常链路', '跨企业', '哈希漂移', '自动人员决定', '版本覆盖'],
      successMetrics: ['全部硬门禁通过', '旧版本不覆盖'],
      rollbackPlan: '不切换当前指针并保留候选和日志',
      userApprovalRequired: true,
    },
    versionGovernance: {
      release: 'candidate -> approved -> archived_formal',
      nonOverwrite: true,
      effectiveDate: '2026-07-29',
      reviewCycle: '每个真实任务后',
      changeTriggers: ['法律政策', '组织规则', '上游版本', '异常案例'],
    },
    evidenceIndex: [{ ref: 'evidence/knowledge_context.json', type: 'knowledge-preflight' }],
    unknowns: ['没有真实员工、地区和薪酬参数'],
    risks: ['模板不得冒充现行地区制度'],
    decisionsRequired: [{
      decision: '是否批准流程复制V1并打通三技能链路',
      owner: 'enterprise-owner',
      executed: false,
    }],
    createdAt: '2026-07-29T00:00:00.000Z',
    ...overrides,
  };
}
