import { kvs, keys, genId, listByPrefix } from './_kvs.js';
import { assertProjectAccess, assertSameProject } from './_auth.js';
import {
  projectKey as vProjectKey,
  idStr,
  enumOf,
  str,
} from './_validate.js';

const STATUSES = ['pending', 'pass', 'fail', 'blocked', 'skipped'];

export function registerRunHandlers(resolver) {
  resolver.define('run.list', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    await assertProjectAccess(context, projectKey, 'read');
    const items = await listByPrefix(`run:${projectKey}:`);
    const scoped = items.filter((r) => r && r.projectKey === projectKey);
    if (payload.planId) {
      const planId = idStr('planId', payload.planId);
      return scoped.filter((r) => r.planId === planId);
    }
    return scoped;
  });

  resolver.define('run.get', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    await assertProjectAccess(context, projectKey, 'read');
    const run = await kvs.get(keys.run(projectKey, id));
    if (run) assertSameProject(run, projectKey);
    return run;
  });

  resolver.define('run.start', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const planId = idStr('planId', payload.planId);
    const userId = await assertProjectAccess(context, projectKey, 'write');
    const plan = await kvs.get(keys.testPlan(projectKey, planId));
    if (!plan) throw new Error('Plano não encontrado');
    assertSameProject(plan, projectKey);
    const now = new Date().toISOString();
    const id = genId();
    const record = {
      id,
      projectKey,
      planId,
      executedBy: userId,
      startedAt: now,
      finishedAt: null,
      status: 'in_progress',
      results: plan.caseRefs.map((ref) => ({
        caseId: ref.caseId,
        version: ref.version,
        status: 'pending',
        stepResults: [],
        bugKeys: [],
      })),
    };
    await kvs.set(keys.run(projectKey, id), record);
    return record;
  });

  resolver.define('run.updateResult', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    const caseId = idStr('caseId', payload.caseId);
    await assertProjectAccess(context, projectKey, 'write');
    const run = await kvs.get(keys.run(projectKey, id));
    if (!run) throw new Error('Execução não encontrada');
    assertSameProject(run, projectKey);

    // sanitiza o patch
    const patch = payload.patch ?? {};
    const clean = {};
    if (patch.status !== undefined)
      clean.status = enumOf('status', patch.status, STATUSES);
    if (patch.bugKeys !== undefined) {
      if (!Array.isArray(patch.bugKeys))
        throw new Error('bugKeys deve ser lista.');
      clean.bugKeys = patch.bugKeys
        .slice(0, 50)
        .map((k, i) => str(`bugKeys[${i}]`, k, { max: 64 }));
    }
    if (patch.stepResults !== undefined) {
      if (!Array.isArray(patch.stepResults))
        throw new Error('stepResults deve ser lista.');
      clean.stepResults = patch.stepResults.slice(0, 500).map((s, i) => ({
        stepId: idStr(`stepResults[${i}].stepId`, s.stepId),
        status: enumOf(`stepResults[${i}].status`, s.status, STATUSES),
        comment: str(`stepResults[${i}].comment`, s.comment, {
          max: 2000,
          optional: true,
        }),
        evidenceUrls: Array.isArray(s.evidenceUrls)
          ? s.evidenceUrls
              .slice(0, 10)
              .map((u, j) =>
                str(`stepResults[${i}].evidenceUrls[${j}]`, u, { max: 500 }),
              )
          : [],
      }));
    }

    run.results = run.results.map((r) =>
      r.caseId === caseId ? { ...r, ...clean } : r,
    );
    await kvs.set(keys.run(projectKey, id), run);
    return run;
  });

  resolver.define('run.finish', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    await assertProjectAccess(context, projectKey, 'write');
    const run = await kvs.get(keys.run(projectKey, id));
    if (!run) throw new Error('Execução não encontrada');
    assertSameProject(run, projectKey);
    run.finishedAt = new Date().toISOString();
    run.status = 'finished';
    await kvs.set(keys.run(projectKey, id), run);
    return run;
  });
}
