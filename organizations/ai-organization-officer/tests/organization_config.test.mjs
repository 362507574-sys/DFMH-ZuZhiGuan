import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { loadOrganizationConfig } from '../scripts/organization_config.mjs';
import { createOrganizationPaths } from '../scripts/organization_paths.mjs';
import { parseStrictJson } from '../scripts/strict_json.mjs';
import { makeProjectFixture, projectRoot } from './helpers.mjs';

test('严格读取组织配置并锁定三技能与公共技能边界', async () => {
  const config = await loadOrganizationConfig({ projectRoot });
  assert.equal(config.id, 'ai-organization-officer');
  assert.equal(config.deploymentMode, 'same_project_organization_module');
  assert.equal(config.acceptsFormalTasks, true);
  assert.deepEqual(
    config.coreSkills.map((item) => `${item.id}:${item.status}`),
    [
      'talent-allocation:formal',
      'talent-development:formal',
      'process-replication:formal',
    ],
  );
  assert.equal(config.status, 'operational');
  assert.equal(config.rootControllerRegistration, 'registered_operational');
  assert.equal(config.formalTaskRouting, 'direct');
  assert.deepEqual(
    config.publicSkillDependencies.map((item) => item.id),
    ['public.promotional-poster', 'public.taobao-ecommerce-image-set'],
  );
});

test('人才培养与流程复制均已正式化', async () => {
  const config = await loadOrganizationConfig({ projectRoot });
  const status = new Map(config.coreSkills.map((item) => [item.id, item.status]));
  assert.equal(status.get('talent-development'), 'formal');
  assert.equal(status.get('process-replication'), 'formal');
});

test('严格JSON拒绝BOM、重复键和未知字段', () => {
  assert.throws(() => parseStrictJson('\uFEFF{"a":1}', { label: 'fixture' }), /BOM/u);
  assert.throws(() => parseStrictJson('{"a":1,"a":2}', { label: 'fixture' }), /duplicate/u);
  assert.throws(
    () => parseStrictJson('{"a":1,"b":2}', {
      label: 'fixture',
      allowedKeys: new Set(['a']),
    }),
    /unexpected field/u,
  );
});

test('组织路径限定企业、任务和请求ID并拒绝目录逃逸', async () => {
  const paths = await createOrganizationPaths({ projectRoot });
  assert.equal(
    paths.enterpriseProfile('acme-demo'),
    path.join(projectRoot, 'organizations', 'ai-organization-officer', 'enterprises', 'acme-demo', 'profile.json'),
  );
  for (const invalid of ['..', '../other', '中文企业', 'bad id', 'C:\\outside']) {
    assert.throws(() => paths.enterpriseProfile(invalid), /invalid|unsafe/u);
  }
  assert.throws(
    () => paths.taskFile('acme-demo', 'bad-task'),
    /taskId.*invalid/u,
  );
});

test('配置未知字段或成熟度虚报会被拒绝', async () => {
  const fixture = await makeProjectFixture();
  const configPath = path.join(
    fixture,
    'organizations',
    'ai-organization-officer',
    'config',
    'organization.json',
  );
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({
    schemaVersion: 1,
    id: 'ai-organization-officer',
    displayName: 'AI组织官',
    systemName: '组织复制系统',
    deploymentMode: 'same_project_organization_module',
    status: 'designing',
    acceptsFormalTasks: true,
    rootControllerRegistration: 'registered_designing',
    formalTaskRouting: 'fallback_existing',
    coreSkills: [
      { id: 'talent-allocation', name: '人才配置', status: 'formal' },
      { id: 'talent-development', name: '人才培养', status: 'designing' },
      { id: 'process-replication', name: '流程复制', status: 'designing' },
    ],
    publicSkillDependencies: [],
    surprise: true,
  }), 'utf8');
  await assert.rejects(
    loadOrganizationConfig({ projectRoot: fixture }),
    /unexpected field|cannot accept|status/u,
  );
});
