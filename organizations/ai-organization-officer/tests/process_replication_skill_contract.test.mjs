import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { loadOrganizationConfig } from '../scripts/organization_config.mjs';
import { organizationRoot, projectRoot } from './helpers.mjs';

const skillPath = path.join(organizationRoot, 'skills', 'process-replication', 'SKILL.md');
const agentPath = path.join(
  organizationRoot,
  'skills',
  'process-replication',
  'agents',
  'openai.yaml',
);

test('正式流程复制Skill具备完整生产契约并与本地成熟度一致', async () => {
  const [skill, agent, config] = await Promise.all([
    readFile(skillPath, 'utf8'),
    readFile(agentPath, 'utf8'),
    loadOrganizationConfig({ projectRoot }),
  ]);

  assert.match(skill, /^---\r?\nname: process-replication\r?\ndescription: Use when /u);
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
    'workflows/PROCESS_REPLICATION_PILOT.md',
    '飞书知识前置',
    '人才配置',
    '人才培养',
    'SHA-256',
    '真实流程',
    '责任矩阵',
    'SOP',
    '表单',
    '知识库',
    '考勤',
    '工资',
    '员工全周期',
    '劳动合规',
    '组织复制包',
    '试点',
    '影子',
    '使用者最终决定',
    '不发薪',
    '不签合同',
    '生产系统',
    '不覆盖',
    '同一根因',
    '三轮',
    'return-package.json',
    '流程与SOP模式',
    '经验与知识模式',
    '工资、考勤和员工运营模式',
    '新组织、新门店或新区域复制模式',
    '真实流程还原',
    '责任与控制点',
    '影子核算',
    '完整周期',
    '员工全生命周期',
    '运行监控',
    '上游变更请求',
    '2.0.0',
  ]) {
    assert.ok(skill.includes(required), `missing required contract: ${required}`);
  }
  assert.match(agent, /display_name:\s*"AI组织官·流程复制"/u);

  const statuses = new Map(config.coreSkills.map((item) => [item.id, item.status]));
  assert.equal(statuses.get('talent-allocation'), 'formal');
  assert.equal(statuses.get('talent-development'), 'formal');
  assert.equal(statuses.get('process-replication'), 'formal');
});
