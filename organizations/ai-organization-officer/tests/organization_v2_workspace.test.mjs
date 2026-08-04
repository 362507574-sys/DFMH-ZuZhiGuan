import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createOrganizationV2Workspace } from '../scripts/organization_v2_workspace.mjs';

async function fixture() {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'ai-org-v2-workspace-'));
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
  return { projectRoot, projectDirectory };
}

test('V2任务工作区只位于当前业务项目的AI组织官目录', async () => {
  const { projectRoot, projectDirectory } = await fixture();
  const result = await createOrganizationV2Workspace({
    projectRoot,
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
  });
  const expected = path.join(
    projectDirectory,
    'organizations',
    'ai-organization-officer',
    'tasks',
    '20260729-101-org-v2-runtime',
  );
  assert.equal(result.taskRoot, expected);
  assert.ok(result.returnFile.startsWith(expected));
  assert.ok(!result.returnFile.includes(`${path.sep}shared-artifacts${path.sep}`));
});

test('V2任务工作区拒绝目录逃逸和无效任务身份', async () => {
  const { projectRoot } = await fixture();
  await assert.rejects(createOrganizationV2Workspace({
    projectRoot,
    enterpriseId: '../other-enterprise',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
  }), /invalid|unsafe|escape/u);
  await assert.rejects(createOrganizationV2Workspace({
    projectRoot,
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '../shared-artifacts',
  }), /taskId/u);
});
