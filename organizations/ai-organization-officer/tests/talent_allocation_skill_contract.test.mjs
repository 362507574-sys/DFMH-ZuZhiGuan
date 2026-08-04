import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { loadOrganizationConfig } from '../scripts/organization_config.mjs';
import { organizationRoot, projectRoot } from './helpers.mjs';

const skillPath = path.join(organizationRoot, 'skills', 'talent-allocation', 'SKILL.md');
const agentPath = path.join(organizationRoot, 'skills', 'talent-allocation', 'agents', 'openai.yaml');

test('正式人才配置Skill具备完整生产契约并与本地成熟度一致', async () => {
  const [skill, agent, config] = await Promise.all([
    readFile(skillPath, 'utf8'),
    readFile(agentPath, 'utf8'),
    loadOrganizationConfig({ projectRoot }),
  ]);

  assert.match(skill, /^---\r?\nname: talent-allocation\r?\ndescription: Use when /u);
  for (const section of [
    '## 适用场景',
    '## 输入',
    '## 固定步骤',
    '## 输出',
    '## 依赖',
    '## 质量检查',
    '## 异常处理',
    '## 重试条件',
    '## 停止条件',
    '## 示例',
    '## 版本记录',
  ]) {
    assert.ok(skill.includes(section), `missing section: ${section}`);
  }
  for (const required of [
    'workflows/TALENT_ALLOCATION_PILOT.md',
    '飞书知识前置',
    '企业隔离',
    '使用者最终决定',
    '不覆盖',
    '录用',
    '辞退',
    '调薪',
    '奖惩',
    '外部发布',
    '同一根因',
    '三轮',
    'return-package.json',
    '总控调用入口',
    '自动规划',
    '判断是否真是人才问题',
    '组织结构与编制',
    '岗位说明书',
    '人才画像与能力模型',
    '招聘和选拔',
    '人岗匹配',
    '绩效、薪酬和组织调整参考',
    '调试与恢复',
    '上游变更请求',
    '总控回传',
    '2.0.0',
  ]) {
    assert.ok(skill.includes(required), `missing required contract: ${required}`);
  }
  assert.ok(!/人才培养.*正式执行|流程复制.*正式执行/u.test(skill));
  assert.match(agent, /display_name:\s*"AI组织官·人才配置"/u);

  const statuses = new Map(config.coreSkills.map((item) => [item.id, item.status]));
  assert.equal(statuses.get('talent-allocation'), 'formal');
  assert.equal(statuses.get('talent-development'), 'formal');
  assert.equal(statuses.get('process-replication'), 'formal');
  assert.ok(config.publicSkillDependencies.every((item) => item.id.startsWith('public.')));
});
