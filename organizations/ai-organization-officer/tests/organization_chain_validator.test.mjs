import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  validateOrganizationChain,
  validateOrganizationChainManifest,
} from '../scripts/organization_chain_validator.mjs';
import { organizationRoot, projectRoot } from './helpers.mjs';

const enterpriseId = 'ai-digital-employee-control-center';
const manifestPath = path.join(
  organizationRoot,
  'enterprises',
  enterpriseId,
  'assets',
  'organization-chain',
  'versions',
  '2.json',
);

test('三技能链路固定人才配置到人才培养再到流程复制并验证全部哈希', async () => {
  const result = await validateOrganizationChain({
    projectRoot,
    enterpriseId,
    manifestPath,
  });
  assert.equal(result.ok, true, JSON.stringify(result.failures));
  assert.deepEqual(
    result.manifest.sequence.map((item) => item.capabilityId),
    ['talent-allocation', 'talent-development', 'process-replication'],
  );
  assert.equal(result.manifest.rootIntegration.rootRegistryModified, false);
});

test('链路拒绝顺序漂移、技能哈希漂移和模糊current依赖', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const drifted = structuredClone(manifest);
  drifted.sequence.reverse();
  drifted.sequence[0].skillSha256 = '0'.repeat(64);
  drifted.dependencyBindings.talentDevelopment.sourceRef = 'current';
  const result = validateOrganizationChainManifest(drifted);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((item) => item.code === 'chain_order_invalid'));
  assert.ok(result.failures.some((item) => item.code === 'skill_hash_invalid'));
  assert.ok(result.failures.some((item) => item.code === 'ambiguous_dependency_ref'));
});
