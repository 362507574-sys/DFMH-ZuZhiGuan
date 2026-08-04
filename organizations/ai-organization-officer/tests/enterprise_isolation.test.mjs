import assert from 'node:assert/strict';
import test from 'node:test';

import { createEnterpriseStore } from '../scripts/enterprise_store.mjs';
import {
  accessEnvelope,
  enterpriseProfile,
  makeProjectFixture,
} from './helpers.mjs';

test('企业档案只能由同企业且具备权限的请求读取', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createEnterpriseStore({ projectRoot });
  await store.createProfile(enterpriseProfile('acme-demo'));
  await store.createProfile(enterpriseProfile('beta-demo'));

  const loaded = await store.readProfile({
    enterpriseId: 'acme-demo',
    accessEnvelope: accessEnvelope('acme-demo'),
  });
  assert.equal(loaded.enterpriseId, 'acme-demo');
  assert.ok(Object.isFrozen(loaded));

  await assert.rejects(
    store.readProfile({
      enterpriseId: 'beta-demo',
      accessEnvelope: accessEnvelope('acme-demo'),
    }),
    /enterprise.*match|cross-enterprise/u,
  );
  await assert.rejects(
    store.readProfile({
      enterpriseId: 'acme-demo',
      accessEnvelope: accessEnvelope('acme-demo', []),
    }),
    /organization\.read/u,
  );
});

test('薪酬、绩效和合同字段按独立权限裁剪且明确拒绝优先', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createEnterpriseStore({ projectRoot });
  await store.createProfile(enterpriseProfile());

  const basic = await store.readProfile({
    enterpriseId: 'acme-demo',
    accessEnvelope: accessEnvelope('acme-demo', ['organization.read']),
  });
  assert.deepEqual(basic.sensitive, {});

  const compensation = await store.readProfile({
    enterpriseId: 'acme-demo',
    accessEnvelope: {
      ...accessEnvelope('acme-demo', ['organization.read', 'staff.compensation.read']),
      deniedScopes: [],
    },
  });
  assert.deepEqual(compensation.sensitive.compensation, { count: 1 });

  await assert.rejects(
    store.readProfile({
      enterpriseId: 'acme-demo',
      accessEnvelope: {
        ...accessEnvelope('acme-demo', ['organization.read', 'staff.compensation.read']),
        deniedScopes: ['staff.compensation.read'],
      },
      requiredSensitiveScopes: ['staff.compensation.read'],
    }),
    /explicitly denied/u,
  );
});

test('创建不覆盖、更新检查版本、过期权限被拒绝', async () => {
  const projectRoot = await makeProjectFixture();
  const store = await createEnterpriseStore({ projectRoot });
  await store.createProfile(enterpriseProfile());
  await assert.rejects(store.createProfile(enterpriseProfile()), /already exists/u);
  await assert.rejects(
    store.updateProfile({
      enterpriseId: 'acme-demo',
      expectedVersion: 9,
      patch: { displayName: '新名称' },
      accessEnvelope: accessEnvelope('acme-demo', ['organization.draft.write']),
    }),
    /version conflict/u,
  );
  await assert.rejects(
    store.readProfile({
      enterpriseId: 'acme-demo',
      accessEnvelope: {
        ...accessEnvelope(),
        expiresAt: '2020-01-01T00:00:00.000Z',
      },
    }),
    /expired/u,
  );
});
