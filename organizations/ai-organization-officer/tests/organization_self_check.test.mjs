import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runOrganizationSelfCheck } from '../scripts/organization_self_check.mjs';
import { organizationRoot, projectRoot } from './helpers.mjs';

test('完整AI组织官模块通过结构化自检', async () => {
  const result = await runOrganizationSelfCheck({ projectRoot });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.ok(result.files > 20);
  assert.equal(result.issues.length, 0);
});

test('任一正式Skill缺失会被自检拦截', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'ai-org-self-check-'));
  const target = path.join(fixture, 'organizations', 'ai-organization-officer');
  await cp(organizationRoot, target, { recursive: true });
  await rm(path.join(target, 'skills', 'talent-development', 'SKILL.md'));
  const result = await runOrganizationSelfCheck({ projectRoot: fixture });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => /talent-development.*SKILL|missing.*talent-development/u.test(item)));
});

test('缺少人才培养Workflow会被自检拦截', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'ai-org-self-check-'));
  const target = path.join(fixture, 'organizations', 'ai-organization-officer');
  await cp(organizationRoot, target, { recursive: true });
  await rm(path.join(target, 'workflows', 'TALENT_DEVELOPMENT_PILOT.md'));
  const result = await runOrganizationSelfCheck({ projectRoot: fixture });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => /TALENT_DEVELOPMENT_PILOT/u.test(item)));
});

test('缺少人才配置Workflow或根级边界语义会被拦截', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'ai-org-self-check-'));
  const target = path.join(fixture, 'organizations', 'ai-organization-officer');
  await cp(organizationRoot, target, { recursive: true });
  await rm(path.join(target, 'workflows', 'TALENT_ALLOCATION_PILOT.md'));
  const charterPath = path.join(target, 'ORGANIZATION.md');
  const charter = await readFile(charterPath, 'utf8');
  await writeFile(charterPath, charter.replace(/不修改总控根级路由/gu, '可修改总控'), 'utf8');
  const result = await runOrganizationSelfCheck({ projectRoot: fixture });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => /TALENT_ALLOCATION_PILOT/u.test(item)));
  assert.ok(result.issues.some((item) => /总控根级路由/u.test(item)));
});

test('缺少V2运行入口会被自检拦截', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'ai-org-self-check-'));
  const target = path.join(fixture, 'organizations', 'ai-organization-officer');
  await cp(organizationRoot, target, { recursive: true });
  await rm(path.join(target, 'scripts', 'organization_v2_runtime.mjs'));
  const result = await runOrganizationSelfCheck({ projectRoot: fixture });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => /organization_v2_runtime/u.test(item)));
});
