import assert from 'node:assert/strict';
import test from 'node:test';

import { validateProcessReplicationCandidate } from '../scripts/process_replication_contract.mjs';
import {
  replicationCandidate,
  replicationEnterprise,
  replicationKnowledge,
  replicationTask,
  upstreamAllocationAsset,
  upstreamDevelopmentAsset,
} from './process_replication_fixtures.mjs';

function validate(candidate = replicationCandidate(), overrides = {}) {
  return validateProcessReplicationCandidate({
    candidate,
    task: replicationTask(),
    enterpriseProfile: replicationEnterprise(),
    knowledgeContext: replicationKnowledge(),
    upstreamTalentAsset: upstreamAllocationAsset(),
    upstreamDevelopmentAsset: upstreamDevelopmentAsset(),
    ...overrides,
  });
}

test('完整流程复制候选覆盖真实流程、SOP、知识、考勤工资、全周期、合规和试点', () => {
  const result = validate();
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});

test('拒绝错误上游版本、只有制度文档或缺少实际流程证据', () => {
  const candidate = replicationCandidate();
  candidate.upstreamAssets.talentDevelopment.formalAssetSha256 = '0'.repeat(64);
  candidate.processDiagnosis.actualEvidenceRefs = [];
  candidate.processDiagnosis.writtenVsActual = [];
  const result = validate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'upstream_asset_mismatch'));
  assert.ok(result.failures.some((item) => item.code === 'actual_process_evidence_missing'));
});

test('拒绝残缺SOP、知识元数据、责任矩阵和复制包', () => {
  const candidate = replicationCandidate();
  candidate.sops[0].exceptions = [];
  candidate.knowledgeBase.entries[0].permissions = [];
  candidate.responsibilityMatrix = [];
  candidate.replicationPackage.qualityControls = [];
  const result = validate(candidate);
  assert.equal(result.ok, false);
  for (const code of [
    'sop_incomplete',
    'knowledge_metadata_incomplete',
    'responsibility_matrix_missing',
    'replication_package_incomplete',
  ]) {
    assert.ok(result.failures.some((item) => item.code === code), code);
  }
});

test('拒绝自动考勤奖惩、自动发薪改薪、把模板冒充现行制度和跳过试点', () => {
  const candidate = replicationCandidate();
  candidate.attendanceSystem.decisionBoundary = '缺勤自动处罚';
  candidate.payrollSystem.decisionBoundary = '系统自动发薪并修改工资';
  candidate.payrollSystem.mode = 'active';
  candidate.payrollSystem.region = '杭州';
  candidate.payrollSystem.cycle = 'monthly';
  candidate.payrollSystem.currentPolicyAsOf = null;
  candidate.pilotPlan.required = false;
  const result = validate(candidate);
  assert.equal(result.ok, false);
  for (const code of [
    'automated_attendance_decision',
    'automated_payroll_action',
    'current_policy_evidence_missing',
    'pilot_required',
  ]) {
    assert.ok(result.failures.some((item) => item.code === code), code);
  }
});

test('拒绝把流程复制当法律意见或直接执行生产写入', () => {
  const candidate = replicationCandidate();
  candidate.laborCompliance.legalAdviceProvided = true;
  candidate.formsAndApprovals.approvalSteps.push('自动签合同并提交社保');
  const result = validate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'legal_advice_overreach'));
  assert.ok(result.failures.some((item) => item.code === 'unauthorized_external_write'));
});

test('V2真实工资必须影子核算且真实考勤必须覆盖完整周期', () => {
  const candidate = replicationCandidate();
  candidate.attendanceSystem.mode = 'active';
  candidate.attendanceSystem.pilot = {
    fullCycleCovered: false,
    unresolvedExceptions: ['异常打卡尚未确认'],
  };
  candidate.payrollSystem.mode = 'active';
  candidate.payrollSystem.region = '浙江省杭州市';
  candidate.payrollSystem.cycle = 'monthly';
  candidate.payrollSystem.currentPolicyAsOf = '2026-07-29';
  candidate.payrollSystem.shadowRun = {
    completed: false,
    unexplainedDifferences: ['存在无法解释的金额差异'],
  };
  const result = validate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'attendance_full_cycle_required'));
  assert.ok(result.failures.some((item) => item.code === 'payroll_shadow_run_required'));
});
