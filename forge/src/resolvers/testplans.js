import { kvs, keys, genId, listByPrefix } from './_kvs.js';

/**
 * TestPlan agrupa casos por sprint/release. Cada item guarda a *versão* do caso
 * — assim reexecutar historicamente é reproduzível.
 * { id, projectKey, name, sprint, description,
 *   caseRefs: [{ caseId, version }], createdAt, createdBy }
 */
export function registerTestPlanHandlers(resolver) {
  resolver.define('tp.list', async ({ payload }) => {
    return listByPrefix(`tp:${payload.projectKey}:`);
  });

  resolver.define('tp.get', async ({ payload }) => {
    return kvs.get(keys.testPlan(payload.projectKey, payload.id));
  });

  resolver.define('tp.save', async ({ payload, context }) => {
    const { projectKey, plan } = payload;
    const now = new Date().toISOString();
    const userId = context?.accountId ?? 'unknown';
    const id = plan.id ?? genId();
    const prev = plan.id ? await kvs.get(keys.testPlan(projectKey, id)) : null;
    const record = {
      id,
      projectKey,
      name: plan.name,
      sprint: plan.sprint ?? null,
      description: plan.description ?? '',
      caseRefs: plan.caseRefs ?? [],
      createdAt: prev?.createdAt ?? now,
      createdBy: prev?.createdBy ?? userId,
      updatedAt: now,
    };
    await kvs.set(keys.testPlan(projectKey, id), record);
    return record;
  });

  resolver.define('tp.delete', async ({ payload }) => {
    await kvs.delete(keys.testPlan(payload.projectKey, payload.id));
    return { ok: true };
  });
}
