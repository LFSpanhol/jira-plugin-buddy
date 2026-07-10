/**
 * Validadores leves (Forge não recomenda dependências pesadas nos resolvers).
 * Cada função lança Error com mensagem legível quando o input é inválido.
 */

const isStr = (v) => typeof v === 'string';
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isArr = Array.isArray;

export function str(name, value, { min = 1, max = 500, optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return '';
    throw new Error(`Campo "${name}" é obrigatório.`);
  }
  if (!isStr(value)) throw new Error(`Campo "${name}" deve ser texto.`);
  const trimmed = value.trim();
  if (trimmed.length < min)
    throw new Error(`Campo "${name}" precisa de ao menos ${min} caractere(s).`);
  if (trimmed.length > max)
    throw new Error(`Campo "${name}" excede ${max} caracteres.`);
  return trimmed;
}

export function enumOf(name, value, allowed) {
  if (!allowed.includes(value))
    throw new Error(`Campo "${name}" inválido. Use um de: ${allowed.join(', ')}`);
  return value;
}

export function idStr(name, value) {
  const v = str(name, value, { max: 64 });
  if (!/^[A-Za-z0-9_-]+$/.test(v))
    throw new Error(`Campo "${name}" contém caracteres inválidos.`);
  return v;
}

export function projectKey(value) {
  const v = str('projectKey', value, { max: 32 });
  // Jira projectKey: letras maiúsculas / dígitos, começa com letra
  if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(v))
    throw new Error('projectKey inválido.');
  return v;
}

export function validateSteps(steps, { maxSteps = 100 } = {}) {
  if (!isArr(steps)) throw new Error('Steps devem ser uma lista.');
  if (steps.length === 0) throw new Error('Adicione ao menos 1 step.');
  if (steps.length > maxSteps)
    throw new Error(`Máximo de ${maxSteps} steps por caso.`);
  return steps.map((s, i) => {
    if (!isObj(s)) throw new Error(`Step #${i + 1} inválido.`);
    const shared = s.sharedStepRef ? idStr(`step[${i}].sharedStepRef`, s.sharedStepRef) : null;
    return {
      id: s.id ? idStr(`step[${i}].id`, s.id) : undefined,
      action: shared ? '' : str(`step[${i}].action`, s.action, { max: 1000 }),
      expected: shared
        ? ''
        : str(`step[${i}].expected`, s.expected, { max: 1000, optional: true }),
      sharedStepRef: shared,
    };
  });
}

export function validateTestCase(tc) {
  if (!isObj(tc)) throw new Error('Test case inválido.');
  return {
    id: tc.id ? idStr('id', tc.id) : undefined,
    title: str('title', tc.title, { max: 200 }),
    tags: isArr(tc.tags)
      ? tc.tags.slice(0, 20).map((t, i) => str(`tags[${i}]`, t, { max: 40 }))
      : [],
    preconditions: str('preconditions', tc.preconditions, {
      max: 2000,
      optional: true,
    }),
    parameters: isObj(tc.parameters) ? tc.parameters : {},
    steps: validateSteps(tc.steps),
    specStatus: tc.specStatus
      ? enumOf('specStatus', tc.specStatus, [
          'draft',
          'review',
          'approved',
          'deprecated',
        ])
      : 'draft',
  };
}

export function validateSharedStep(ss) {
  if (!isObj(ss)) throw new Error('Bloco inválido.');
  return {
    id: ss.id ? idStr('id', ss.id) : undefined,
    title: str('title', ss.title, { max: 200 }),
    description: str('description', ss.description, { max: 1000, optional: true }),
    steps: validateSteps(ss.steps, { maxSteps: 50 }),
  };
}

export function validatePlan(plan) {
  if (!isObj(plan)) throw new Error('Plano inválido.');
  const caseRefs = isArr(plan.caseRefs) ? plan.caseRefs : [];
  return {
    id: plan.id ? idStr('id', plan.id) : undefined,
    name: str('name', plan.name, { max: 200 }),
    sprint: str('sprint', plan.sprint, { max: 100, optional: true }),
    description: str('description', plan.description, { max: 2000, optional: true }),
    caseRefs: caseRefs.slice(0, 500).map((r, i) => ({
      caseId: idStr(`caseRefs[${i}].caseId`, r.caseId),
      version: Number.isInteger(r.version) && r.version > 0 ? r.version : 1,
    })),
  };
}

export function validateBugPayload(p) {
  return {
    summary: str('summary', p.summary, { max: 255 }),
    description: str('description', p.description, { max: 5000, optional: true }),
    testCaseId: idStr('testCaseId', p.testCaseId),
    runId: idStr('runId', p.runId),
  };
}
