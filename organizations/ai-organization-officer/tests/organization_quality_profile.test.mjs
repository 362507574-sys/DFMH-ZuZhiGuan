import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  parseOrganizationQualityProfile,
} from '../../../scripts/control-center/organization_quality_contract.mjs';

const organizationRoot = path.resolve(import.meta.dirname, '..');

test('AI组织官质量档案与根级正式状态一致，并以真实验收证据标记三项技能', async () => {
  const source = await readFile(
    path.join(organizationRoot, 'quality', 'organization-quality.json'),
    'utf8',
  );
  const profile = parseOrganizationQualityProfile(source, {
    expectedOrganizationId: 'ai-organization-officer',
  });
  assert.equal(profile.declaredRootStatus, 'operational');
  assert.equal(profile.acceptsFormalTasks, true);
  assert.deepEqual(
    profile.skills.map((skill) => skill.evidenceLevel),
    ['real_accepted', 'real_accepted', 'real_accepted'],
  );
  assert.deepEqual(profile.knownGaps, []);
  assert.equal(profile.fast.boundedDispatch, true);
  assert.equal(profile.accurate.hasQualityGate, true);
  assert.equal(profile.stable.idempotentResume, true);
});
