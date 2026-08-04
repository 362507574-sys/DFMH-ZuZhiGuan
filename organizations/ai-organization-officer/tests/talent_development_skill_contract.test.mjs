import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { loadOrganizationConfig } from '../scripts/organization_config.mjs';
import { organizationRoot, projectRoot } from './helpers.mjs';

const skillPath = path.join(organizationRoot, 'skills', 'talent-development', 'SKILL.md');
const agentPath = path.join(
  organizationRoot,
  'skills',
  'talent-development',
  'agents',
  'openai.yaml',
);

test('正式人才培养Skill具备完整生产契约并与本地成熟度一致', async () => {
  const [skill, agent, config] = await Promise.all([
    readFile(skillPath, 'utf8'),
    readFile(agentPath, 'utf8'),
    loadOrganizationConfig({ projectRoot }),
  ]);

  assert.match(skill, /^---\r?\nname: talent-development\r?\ndescription: Use when /u);
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
    'workflows/TALENT_DEVELOPMENT_PILOT.md',
    '飞书知识前置',
    '企业隔离',
    '已批准人才配置',
    'SHA-256',
    '真实工作任务',
    '至少两类证据',
    '单次考试',
    '使用者最终决定',
    '转正',
    '晋升',
    '调岗',
    '调薪',
    '奖惩',
    '辞退',
    '流程复制下游简报',
    '不覆盖',
    '同一根因',
    '三轮',
    'return-package.json',
    '判断是否真是培训问题',
    '能力差距',
    '理解',
    '在指导下完成',
    '独立完成',
    '处理异常',
    '教会他人',
    '优化并复制',
    '导师反馈',
    '评估与认证',
    '成长路径',
    '知识传承',
    '效果复盘',
    '调试与恢复',
    '上游变更请求',
    '2.0.0',
  ]) {
    assert.ok(skill.includes(required), `missing required contract: ${required}`);
  }
  assert.match(agent, /display_name:\s*"AI组织官·人才培养"/u);

  const statuses = new Map(config.coreSkills.map((item) => [item.id, item.status]));
  assert.equal(statuses.get('talent-allocation'), 'formal');
  assert.equal(statuses.get('talent-development'), 'formal');
  assert.equal(statuses.get('process-replication'), 'formal');
});
