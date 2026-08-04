const ROOT_STATUSES = new Set(['designing', 'pilot', 'operational']);
const EVIDENCE_LEVELS = new Set([
  'design',
  'simulation',
  'internal_real',
  'real_accepted',
]);
const TOP_FIELDS = new Set([
  'schemaVersion',
  'organizationId',
  'declaredRootStatus',
  'acceptsFormalTasks',
  'skills',
  'fast',
  'accurate',
  'stable',
  'knownGaps',
  'nextOrganizationGate',
]);
const SKILL_FIELDS = new Set([
  'id',
  'skillPath',
  'workflowPath',
  'runtimePaths',
  'testPaths',
  'qualityProofPaths',
  'evidenceLevel',
  'knownGaps',
  'nextGate',
]);
const SKILL_REQUIRED_FIELDS = new Set(
  [...SKILL_FIELDS].filter((field) => field !== 'qualityProofPaths'),
);

export function parseOrganizationQualityProfile(
  json,
  { expectedOrganizationId } = {},
) {
  if (typeof json !== 'string' || !json.trim() || json.length > 1024 * 1024) {
    throw new TypeError('organization quality profile must be bounded JSON text');
  }
  let value;
  try {
    value = JSON.parse(json);
  } catch {
    throw new SyntaxError('organization quality profile is invalid JSON');
  }
  assertPlain(value, 'organization quality profile');
  assertExactFields(value, TOP_FIELDS, 'organization quality profile');
  if (value.schemaVersion !== 1) throw new Error('quality profile schemaVersion must be 1');
  const organizationId = safeId(value.organizationId, 'organizationId');
  if (expectedOrganizationId !== undefined
      && organizationId !== expectedOrganizationId) {
    throw new Error('organization quality profile identity conflict');
  }
  if (!ROOT_STATUSES.has(value.declaredRootStatus)) {
    throw new Error('declaredRootStatus is invalid');
  }
  if (typeof value.acceptsFormalTasks !== 'boolean') {
    throw new TypeError('acceptsFormalTasks must be boolean');
  }
  if ((value.declaredRootStatus === 'operational') !== value.acceptsFormalTasks) {
    throw new Error('operational status conflict');
  }
  if (!Array.isArray(value.skills) || value.skills.length !== 3) {
    throw new Error('quality profile must contain exactly three skills');
  }
  const skills = value.skills.map((item, index) =>
    parseSkill(item, organizationId, index));
  if (new Set(skills.map((item) => item.id)).size !== skills.length) {
    throw new Error('quality profile contains duplicate skills');
  }
  const fast = parsePillar(value.fast, 'fast', [
    'boundedDispatch',
    'reusesSharedRuntime',
  ]);
  const accurate = parsePillar(value.accurate, 'accurate', [
    'separatesEvidence',
    'locksExactDependencies',
    'hasQualityGate',
  ]);
  const stable = parsePillar(value.stable, 'stable', [
    'persistsState',
    'idempotentResume',
    'boundedRetry',
  ]);
  const knownGaps = stringList(value.knownGaps, 'knownGaps', { allowEmpty: true });
  const nextOrganizationGate = boundedString(
    value.nextOrganizationGate,
    'nextOrganizationGate',
  );
  if (value.declaredRootStatus === 'operational') {
    if (skills.some((skill) => skill.evidenceLevel !== 'real_accepted')) {
      throw new Error('operational organization requires real_accepted evidence');
    }
    if (knownGaps.length) {
      throw new Error('operational organization cannot declare unresolved gaps');
    }
  }
  return deepFreeze({
    schemaVersion: 1,
    organizationId,
    declaredRootStatus: value.declaredRootStatus,
    acceptsFormalTasks: value.acceptsFormalTasks,
    skills,
    fast,
    accurate,
    stable,
    knownGaps,
    nextOrganizationGate,
  });
}

function parseSkill(value, organizationId, index) {
  const label = `skills[${index}]`;
  assertPlain(value, label);
  assertAllowedAndRequiredFields(
    value,
    SKILL_FIELDS,
    SKILL_REQUIRED_FIELDS,
    label,
  );
  const id = safeId(value.id, `${label}.id`);
  const prefix = `organizations/${organizationId}/`;
  const skillPath = safeRelativePath(value.skillPath, `${label}.skillPath`, prefix);
  const workflowPath = safeRelativePath(
    value.workflowPath,
    `${label}.workflowPath`,
    prefix,
  );
  const runtimePaths = pathList(
    value.runtimePaths,
    `${label}.runtimePaths`,
    prefix,
  );
  const testPaths = pathList(value.testPaths, `${label}.testPaths`, prefix);
  const qualityProofPaths = value.qualityProofPaths === undefined
    ? []
    : pathList(
      value.qualityProofPaths,
      `${label}.qualityProofPaths`,
      prefix,
    );
  if (!EVIDENCE_LEVELS.has(value.evidenceLevel)) {
    throw new Error(`${label}.evidenceLevel is invalid`);
  }
  return {
    id,
    skillPath,
    workflowPath,
    runtimePaths,
    testPaths,
    qualityProofPaths,
    evidenceLevel: value.evidenceLevel,
    knownGaps: stringList(value.knownGaps, `${label}.knownGaps`, {
      allowEmpty: true,
    }),
    nextGate: boundedString(value.nextGate, `${label}.nextGate`),
  };
}

function parsePillar(value, label, booleanFields) {
  assertPlain(value, label);
  const expected = new Set([...booleanFields, 'evidencePaths']);
  assertExactFields(value, expected, label);
  const result = {};
  for (const field of booleanFields) {
    if (typeof value[field] !== 'boolean') {
      throw new TypeError(`${label}.${field} must be boolean`);
    }
    result[field] = value[field];
  }
  result.evidencePaths = pathList(value.evidencePaths, `${label}.evidencePaths`);
  return result;
}

function pathList(value, label, prefix) {
  if (!Array.isArray(value) || !value.length) {
    throw new Error(`${label} must be a non-empty path array`);
  }
  const result = value.map((item, index) =>
    safeRelativePath(item, `${label}[${index}]`, prefix));
  if (new Set(result).size !== result.length) {
    throw new Error(`${label} contains duplicate paths`);
  }
  return result;
}

function safeRelativePath(value, label, prefix) {
  const result = boundedString(value, label, 512).replaceAll('\\', '/');
  if (result.startsWith('/') || /^[a-z]:/iu.test(result)) {
    throw new Error(`${label} contains unsafe path`);
  }
  const segments = result.split('/');
  if (segments.some((segment) =>
    !segment
    || segment === '.'
    || segment === '..'
    || segment.toLowerCase() === 'current'
    || segment.toLowerCase() === 'latest')) {
    throw new Error(`${label} contains dynamic reference or unsafe path`);
  }
  if (prefix && !result.startsWith(prefix)) {
    throw new Error(`${label} must stay inside its organization`);
  }
  return result;
}

function stringList(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length)) {
    throw new Error(`${label} must be an array`);
  }
  const result = value.map((item, index) =>
    boundedString(item, `${label}[${index}]`, 500));
  if (new Set(result).size !== result.length) {
    throw new Error(`${label} contains duplicates`);
  }
  return result;
}

function safeId(value, label) {
  const result = boundedString(value, label, 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(result)) {
    throw new Error(`${label} must be a safe id`);
  }
  return result;
}

function boundedString(value, label, maximum = 1000) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()
      || value.length > maximum) {
    throw new TypeError(`${label} must be a bounded string`);
  }
  return value;
}

function assertExactFields(value, expected, label) {
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new Error(`${label} contains unknown field: ${key}`);
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) throw new Error(`${label} missing field: ${key}`);
  }
}

function assertAllowedAndRequiredFields(value, allowed, required, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${label} contains unknown field: ${key}`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw new Error(`${label} missing field: ${key}`);
  }
}

function assertPlain(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
