import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { projectRoot } from './helpers.mjs';

test('控制中心已登记五组织、十五技能和两个公共技能', async () => {
  const organizations = JSON.parse(await readFile(
    path.join(projectRoot, 'control-center', 'registries', 'organizations.json'),
    'utf8',
  ));
  const publicRegistry = JSON.parse(await readFile(
    path.join(projectRoot, 'public-skills', 'registry.json'),
    'utf8',
  ));
  const organization = organizations.organizations.find(
    (item) => item.id === 'ai-organization-officer',
  );
  assert.equal(organizations.organizations.length, 5);
  assert.equal(
    organizations.organizations.flatMap((item) => item.coreSkills).length,
    15,
  );
  assert.equal(organization.displayName, 'AI组织官');
  assert.equal(organization.status, 'operational');
  assert.equal(organization.acceptsFormalTasks, true);
  assert.equal(organization.directory, 'organizations/ai-organization-officer');
  assert.deepEqual(
    organization.coreSkills.map((item) => `${item.id}:${item.status}`),
    [
      'talent-allocation:operational',
      'talent-development:operational',
      'process-replication:operational',
    ],
  );
  assert.equal(publicRegistry.publicSkills.length, 2);
  assert.ok(publicRegistry.publicSkills.some((item) => item.id === 'public.promotional-poster'));
  assert.ok(publicRegistry.publicSkills.some((item) => item.id === 'public.taobao-ecommerce-image-set'));
  assert.ok(
    organization.coreSkills.every((item) => !item.id.startsWith('public.')),
    '公共技能不得进入组织三个核心技能',
  );
});

test('AI组织官章程说明成熟度和根级边界', async () => {
  const charter = await readFile(
    path.join(projectRoot, 'organizations', 'ai-organization-officer', 'ORGANIZATION.md'),
    'utf8',
  );
  for (const expected of [
    'ai-organization-officer',
    '人才配置',
    '人才培养',
    '流程复制',
    'operational',
    'organization',
  ]) assert.match(charter, new RegExp(expected, 'u'));
  assert.match(charter, /不修改.*总控根级路由/u);
});
