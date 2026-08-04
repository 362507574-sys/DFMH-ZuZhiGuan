import assert from 'node:assert/strict';
import test from 'node:test';

import { validateOrganizationInvocationV2 } from '../scripts/organization_invocation_v2.mjs';
import { invocation } from './organization_v2_fixtures.mjs';

test('V2调用锁定企业项目主Skill和权限', () => {
  const result = validateOrganizationInvocationV2(invocation());
  assert.equal(result.enterpriseId, 'acme-demo');
  assert.equal(result.primarySkill, 'talent-allocation');
  assert.equal(Object.isFrozen(result), true);
});

test('V2调用拒绝隐藏扩链、跨企业权限和根级写权限', () => {
  assert.throws(() => validateOrganizationInvocationV2(invocation({
    allowedCapabilityChain: ['talent-allocation', 'talent-development'],
  })), /single-skill/u);
  assert.throws(() => validateOrganizationInvocationV2(invocation({
    permissionPackage: {
      enterpriseId: 'beta-demo',
      allowedScopes: ['organization.read'],
      deniedScopes: [],
    },
  })), /enterprise/u);
  assert.throws(() => validateOrganizationInvocationV2(invocation({
    permissionPackage: {
      enterpriseId: 'acme-demo',
      allowedScopes: ['root.outputs.write'],
      deniedScopes: [],
    },
  })), /root|scope/u);
});

test('继续执行必须绑定原企业项目任务和检查点', () => {
  assert.throws(() => validateOrganizationInvocationV2(invocation({
    mode: 'continuation',
  })), /continuationContext/u);
  assert.equal(validateOrganizationInvocationV2(invocation({
    mode: 'continuation',
    continuationContext: {
      enterpriseId: 'acme-demo',
      businessProjectId: '20260729-101-org-build-001',
      taskId: '20260729-101-org-v2-runtime',
      checkpointId: 'cp-001',
      planVersion: 1,
    },
  })).mode, 'continuation');
});
