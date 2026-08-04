import { mkdtemp, mkdir, cp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const organizationRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const projectRoot = path.resolve(organizationRoot, '..', '..');

export async function makeProjectFixture({ includeRoot = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-org-officer-'));
  const target = path.join(root, 'organizations', 'ai-organization-officer');
  await mkdir(target, { recursive: true });
  if (includeRoot) {
    for (const relative of [
      'control-center/registries/organizations.json',
      'public-skills/registry.json',
      'organizations/ai-organization-officer/ORGANIZATION.md',
      'config/feishu-commander-capabilities.json',
    ]) {
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await cp(path.join(projectRoot, relative), path.join(root, relative));
    }
  }
  return root;
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function enterpriseProfile(id = 'acme-demo') {
  return {
    schemaVersion: 1,
    enterpriseId: id,
    displayName: id === 'acme-demo' ? '示例企业' : '第二企业',
    region: { country: 'CN', province: '浙江省', city: '杭州市' },
    timezone: 'Asia/Shanghai',
    authorization: {
      grantedBy: 'enterprise-owner',
      grantedAt: '2026-07-28T00:00:00.000Z',
      allowedScopes: ['organization.read', 'organization.draft.write'],
      deniedScopes: ['staff.compensation.read', 'staff.contract.read'],
    },
    organizationSummary: {},
    sensitive: {
      compensation: { count: 1 },
      performance: { count: 1 },
      contracts: { count: 1 },
    },
    facts: [],
    unknowns: [],
    version: 1,
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  };
}

export function accessEnvelope(enterpriseId = 'acme-demo', scopes = ['organization.read']) {
  return {
    enterpriseId,
    allowedScopes: scopes,
    deniedScopes: [],
    expiresAt: '2099-08-04T00:00:00.000Z',
  };
}

export function organizationTask(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: '20260728-001-talent-allocation',
    parentTaskId: '20260728-001-talent-allocation',
    idempotencyKey: 'acme-demo|20260728-001-talent-allocation',
    enterpriseId: 'acme-demo',
    primaryOrganization: 'ai-organization-officer',
    capabilityId: 'talent-allocation',
    status: 'received',
    accessEnvelope: accessEnvelope('acme-demo', [
      'organization.read',
      'organization.draft.write',
    ]),
    inputRefs: [],
    knowledgeStatus: 'pending',
    candidateVersion: 0,
    revision: 1,
    failureCounts: {},
    decisionRef: null,
    approvedCandidateSha256: null,
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}

export function validCandidate(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: '20260728-001-talent-allocation',
    enterpriseId: 'acme-demo',
    version: 1,
    diagnosis: {
      businessContext: { objective: '建立销售负责人岗位标准' },
      organizationProblems: ['销售管理责任尚未形成岗位标准'],
      nonTalentRootCauses: ['销售流程仍需后续核验'],
      evidenceRefs: ['evidence/knowledge_context.json'],
    },
    organizationDesign: {
      departments: ['销售部'],
      reportingLines: ['销售负责人向企业负责人汇报'],
      decisionRights: ['在批准预算内安排销售过程管理'],
    },
    staffingPlan: {
      requiredNow: ['销售负责人'],
      developInternally: [],
      deferred: [],
    },
    jobProfiles: [{
      id: 'sales-lead',
      purpose: '建立可预测的销售执行与复盘机制',
      responsibilities: ['制定周销售计划并依据客户阶段检查团队执行'],
      deliverables: ['周销售预测和差异复盘'],
      qualityStandards: ['数据来源可追溯，偏差有原因和纠正动作'],
      decisionRights: ['安排团队日常销售动作'],
      performanceIndicators: ['有效商机推进率'],
    }],
    talentProfiles: [{
      jobId: 'sales-lead',
      requiredCapabilities: ['销售过程管理', '团队辅导'],
      trainableCapabilities: ['企业产品知识'],
      observableEvidence: ['过去负责团队的销售预测记录与复盘样例'],
      riskSignals: ['只提供个人业绩但没有团队管理证据'],
    }],
    recruitmentPackage: {
      priority: 'high',
      resumeCriteria: ['具备可核验的团队销售管理经历'],
      interviewQuestions: ['请用真实案例说明一次预测偏差及纠正过程'],
      workSample: '根据匿名商机清单形成一周推进计划',
      scoringEvidence: ['事实完整性', '判断逻辑', '风险意识'],
      probationTargets: ['第一个月完成现状诊断并建立周复盘'],
    },
    personJobMatches: [{
      personRef: 'candidate-anonymous-1',
      jobId: 'sales-lead',
      dimensions: [{ name: '销售管理', assessment: '待验证', evidenceRefs: [] }],
      overall: '证据不足，不能形成录用建议',
      unknowns: ['缺少团队管理成果证据'],
    }],
    performanceDesign: {
      resultIndicators: ['有效商机推进率'],
      processIndicators: ['周复盘完成率'],
      dataSources: ['CRM导出与复盘记录'],
      reviewCycle: 'monthly',
    },
    compensationDesign: {
      status: 'requires-current-market-research',
      region: '浙江省杭州市',
      asOfDate: '2026-07-28',
      sourceRefs: ['https://example.invalid/placeholder-not-for-production'],
    },
    adjustmentRecommendations: [{
      recommendation: '先建立岗位和流程，再依据持续证据判断人员安排',
      status: 'advisory',
      requiresUserDecision: true,
    }],
    evidenceIndex: [{
      ref: 'evidence/knowledge_context.json',
      type: 'internal-knowledge-preflight',
      factClass: 'knowledge-result',
    }],
    unknowns: ['真实业务量和薪酬预算待企业负责人补充'],
    risks: ['公开市场信息尚未完成当前检索，不得正式使用薪酬范围'],
    decisionsRequired: [{
      decision: '是否按该岗位标准进入招聘准备',
      owner: 'enterprise-owner',
      executed: false,
    }],
    downstreamBrief: {
      talentDevelopment: { needs: ['销售负责人上岗训练与管理者辅导'] },
      processReplication: { needs: ['销售预测与周复盘SOP'] },
    },
    createdAt: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}
