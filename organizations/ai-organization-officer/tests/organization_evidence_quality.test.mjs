import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEvidenceIndex } from '../scripts/organization_evidence_engine.mjs';
import { evaluateOrganizationQuality } from '../scripts/organization_quality_engine.mjs';

test('证据索引区分事实、推断和未知并保留冲突', () => {
  const result = buildEvidenceIndex({
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
    entries: [
      { id: 'e1', classification: 'fact', sourceRef: 'inputs/interview-1.md', statement: '当前有5名销售', observedAt: '2026-07-29' },
      { id: 'e2', classification: 'inference', sourceRef: 'e1', statement: '管理跨度可能过大', observedAt: '2026-07-29' },
      { id: 'e3', classification: 'unknown', sourceRef: '', statement: '真实商机量未提供', observedAt: '2026-07-29', conflictsWith: ['e1'] },
    ],
  });
  assert.equal(result.entries.length, 3);
  assert.equal(result.entries[2].classification, 'unknown');
  assert.deepEqual(result.conflicts, ['e3']);
});

test('四级质量同时要求证据、版本、决定边界和回传就绪', () => {
  const report = evaluateOrganizationQuality({
    artifactChecks: [{ id: 'a1', passed: true }],
    skillChecks: [{ id: 's1', passed: true }],
    crossSkillChecks: [{ id: 'c1', passed: true }],
    chainChecks: [{ id: 'o1', passed: true }],
    evidenceReady: true,
    versionBindingsReady: true,
    decisionBoundaryReady: true,
    returnPackageReady: true,
  });
  assert.equal(report.ok, true);
  assert.deepEqual(report.levels.map((item) => item.status), ['passed', 'passed', 'passed', 'passed']);
  assert.equal(evaluateOrganizationQuality({
    artifactChecks: [{ id: 'a1', passed: false }],
    evidenceReady: false,
    versionBindingsReady: false,
    decisionBoundaryReady: false,
    returnPackageReady: false,
  }).ok, false);
});
