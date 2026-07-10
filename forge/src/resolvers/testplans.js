import { kvs, keys, genId, listByPrefix } from './_kvs.js';
import { assertProjectAccess, assertSameProject } from './_auth.js';
import { projectKey as vProjectKey, idStr, validatePlan } from './_validate.js';

export function registerTestPlanHandlers(resolver) {
  resolver.define('tp.list', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    await assertProjectAccess(context, projectKey, 'read');
    const items = await listByPrefix(`tp:${projectKey}:`);
    return items.filter((p) => p && p.projectKey === projectKey);
  });

  resolver.define('tp.get', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    await assertProjectAccess(context, projectKey, 'read');
    const p = await kvs.get(keys.testPlan(projectKey, id));
    if (p) assertSameProject(p, projectKey);
    return p;
  });

  resolver.define('tp.save', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const userId = await assertProjectAccess(context, projectKey, 'write');
    const plan = validatePlan(payload.plan);

    // valida que todos os casos referenciados pertencem ao mesmo projeto
    for (const ref of plan.caseRefs) {
      const tc = await kvs.get(keys.testCase(projectKey, ref.caseId));
      if (!tc) throw new Error(`Caso ${ref.caseId} não encontrado.`);
      assertSameProject(tc, projectKey);
    }

    const now = new Date().toISOString();
    const id = plan.id ?? genId();
    const prev = plan.id ? await kvs.get(keys.testPlan(projectKey, id)) : null;
    if (prev) assertSameProject(prev, projectKey);
    const record = {
      id,
      projectKey,
      name: plan.name,
      sprint: plan.sprint,
      description: plan.description,
      caseRefs: plan.caseRefs,
      createdAt: prev?.createdAt ?? now,
      createdBy: prev?.createdBy ?? userId,
      updatedAt: now,
      updatedBy: userId,
    };
    await kvs.set(keys.testPlan(projectKey, id), record);
    return record;
  });

  resolver.define('tp.delete', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    await assertProjectAccess(context, projectKey, 'write');
    const prev = await kvs.get(keys.testPlan(projectKey, id));
    if (prev) assertSameProject(prev, projectKey);
    await kvs.delete(keys.testPlan(projectKey, id));
    return { ok: true };
  });
}
