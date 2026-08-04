import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createOrganizationV2Runtime } from '../scripts/organization_v2_runtime.mjs';
import { invocation } from './organization_v2_fixtures.mjs';

async function projectFixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'ai-org-v2-runtime-'));
  const projectDirectory = path.join(
    projectRoot,
    'business-projects',
    'acme-demo',
    '20260729-101-org-build-001',
  );
  await mkdir(path.join(projectDirectory, 'organizations', 'ai-organization-officer'), { recursive: true });
  await writeFile(path.join(projectDirectory, 'project.json'), JSON.stringify({
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    status: 'active',
  }), 'utf8');
  return projectRoot;
}

test('运行入口一次初始化调用、计划、执行和七类凭证路径', async () => {
  const runtime = await createOrganizationV2Runtime({
    projectRoot: await projectFixture(),
    invocation: invocation(),
    now: () => new Date('2026-07-29T09:00:00.000Z'),
  });
  const result = await runtime.initialize({ availableInputs: [] });
  assert.equal(result.execution.status, 'planning');
  assert.deepEqual(result.plan.capabilitySequence, ['talent-allocation']);
  assert.ok(result.workspace.qualityFile.endsWith('quality-report.json'));
  assert.ok(result.workspace.debugRoot.endsWith('debug-records'));
});

test('运行入口把下游缺陷写成总控上游变更请求', async () => {
  const runtime = await createOrganizationV2Runtime({
    projectRoot: await projectFixture(),
    invocation: invocation({
      primarySkill: 'talent-development',
      allowedCapabilityChain: ['talent-development'],
      goal: '建立销售负责人岗位训练',
    }),
  });
  await runtime.initialize({ availableInputs: [] });
  const request = await runtime.requestUpstreamChange({
    targetSkill: 'talent-allocation',
    problem: '岗位质量标准不可验收',
    evidence: ['quality-report.json#job-standard'],
    impact: ['训练评估暂停'],
    currentBinding: { artifactId: 'talent-allocation', version: 2, sha256: 'a'.repeat(64) },
    recommendedChange: ['补充可观察质量标准'],
  });
  assert.equal(request.status, 'requested_to_control_center');
  assert.equal(request.currentBinding.version, 2);
});
