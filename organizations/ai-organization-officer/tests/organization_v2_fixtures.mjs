export function invocation(overrides = {}) {
  return {
    schemaVersion: 2,
    enterpriseId: 'acme-demo',
    businessProjectId: '20260729-101-org-build-001',
    taskId: '20260729-101-org-v2-runtime',
    primaryOrganization: 'ai-organization-officer',
    primarySkill: 'talent-allocation',
    mode: 'single-skill',
    goal: '建立销售负责人岗位、人才和招聘标准',
    authorizedScope: ['sales-lead'],
    allowedCapabilityChain: ['talent-allocation'],
    allowedCollaborations: [],
    allowedPublicSkills: [],
    permissionPackage: {
      enterpriseId: 'acme-demo',
      allowedScopes: ['organization.read', 'organization.draft.write'],
      deniedScopes: [],
    },
    decisionBoundary: ['录用、调薪和辞退由使用者决定'],
    pinnedInputs: [],
    continuationContext: null,
    ...overrides,
  };
}
