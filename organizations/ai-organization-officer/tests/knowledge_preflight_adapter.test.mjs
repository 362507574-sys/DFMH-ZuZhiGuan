import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { runOrganizationKnowledgePreflight } from '../scripts/knowledge_preflight_adapter.mjs';
import { makeProjectFixture, writeJson } from './helpers.mjs';

function task() {
  return {
    requestId: '20260728-001-talent-allocation',
    text: '为销售负责人建立岗位和招聘标准',
    summary: '销售负责人岗位与人才配置',
    capabilityId: 'ai-organization-officer.talent-allocation',
    enterpriseId: 'acme-demo',
    taskId: '20260728-001-talent-allocation',
  };
}

test('知识适配器固定证据路径并保留matched来源', async () => {
  const projectRoot = await makeProjectFixture();
  let received;
  const result = await runOrganizationKnowledgePreflight({
    projectRoot,
    task: task(),
    executeCli: async ({ input, evidenceAbsolutePath }) => {
      received = input;
      const evidence = {
        requestId: input.requestId,
        capabilityId: input.capabilityId,
        status: 'matched',
        sources: [{
          spaceName: '老雷知识库',
          title: '销售管理资料',
          token: 'doc-token',
          excerpt: '岗位标准需要对应实际业务。',
        }],
      };
      await writeJson(evidenceAbsolutePath, evidence);
      return evidence;
    },
  });
  assert.equal(result.status, 'matched');
  assert.equal(result.sources.length, 1);
  assert.equal(
    received.evidencePath,
    'organizations/ai-organization-officer/tasks/acme-demo/20260728-001-talent-allocation/evidence/knowledge_context.json',
  );
});

test('no_hit和degraded继续，正式任务拒绝skipped_non_business', async () => {
  for (const status of ['no_hit', 'degraded']) {
    const projectRoot = await makeProjectFixture();
    const result = await runOrganizationKnowledgePreflight({
      projectRoot,
      task: task(),
      executeCli: async ({ input, evidenceAbsolutePath }) => {
        const evidence = {
          requestId: input.requestId,
          capabilityId: input.capabilityId,
          status,
          sources: [],
          ...(status === 'degraded' ? { degradedReason: 'permission unavailable' } : {}),
        };
        await writeJson(evidenceAbsolutePath, evidence);
        return evidence;
      },
    });
    assert.equal(result.status, status);
  }

  const projectRoot = await makeProjectFixture();
  await assert.rejects(
    runOrganizationKnowledgePreflight({
      projectRoot,
      task: task(),
      executeCli: async ({ input, evidenceAbsolutePath }) => {
        await writeJson(evidenceAbsolutePath, {
          requestId: input.requestId,
          capabilityId: input.capabilityId,
          status: 'skipped_non_business',
          sources: [],
        });
      },
    }),
    /formal.*skipped_non_business/u,
  );
});

test('适配器拒绝跨企业或根级outputs证据路径覆盖', async () => {
  const projectRoot = await makeProjectFixture();
  await assert.rejects(
    runOrganizationKnowledgePreflight({
      projectRoot,
      task: { ...task(), evidencePath: '../../outputs/result.json' },
      executeCli: async () => {},
    }),
    /evidencePath.*fixed|unsafe/u,
  );
  await assert.rejects(
    readFile(path.join(projectRoot, 'outputs', 'result.json')),
    /ENOENT/u,
  );
});
