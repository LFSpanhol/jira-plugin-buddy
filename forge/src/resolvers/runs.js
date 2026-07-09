import { kvs, keys, genId, listByPrefix } from './_kvs.js';

/**
 * Run = execução de um TestPlan por um usuário.
 * results: [{
 *   caseId, version, status: 'pass'|'fail'|'blocked'|'skipped'|'pending',
 *   stepResults: [{ stepId, status, comment, evidenceUrls: [] }],
 *   bugKeys: [] // issues do Jira criadas a partir daqui
 * }]
 */
export function registerRunHandlers(resolver) {
  resolver.define('run.list', async ({ payload }) => {
    const items = await listByPrefix(`run:${payload.projectKey}:`);
    if (payload.planId) return items.filter((r) => r.planId === payload.planId);
    return items;
  });

  resolver.define('run.get', async ({ payload }) => {
    return kvs.get(keys.run(payload.projectKey, payload.id));
  });

  resolver.define('run.start', async ({ payload, context }) => {
    const { projectKey, planId } = payload;
    const plan = await kvs.get(keys.testPlan(projectKey, planId));
    if (!plan) throw new Error('Plano não encontrado');
    const now = new Date().toISOString();
    const userId = context?.accountId ?? 'unknown';
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

  resolver.define('run.updateResult', async ({ payload }) => {
    const { projectKey, id, caseId, patch } = payload;
    const run = await kvs.get(keys.run(projectKey, id));
    if (!run) throw new Error('Execução não encontrada');
    run.results = run.results.map((r) =>
      r.caseId === caseId ? { ...r, ...patch } : r,
    );
    await kvs.set(keys.run(projectKey, id), run);
    return run;
  });

  resolver.define('run.finish', async ({ payload }) => {
    const { projectKey, id } = payload;
    const run = await kvs.get(keys.run(projectKey, id));
    if (!run) throw new Error('Execução não encontrada');
    run.finishedAt = new Date().toISOString();
    run.status = 'finished';
    await kvs.set(keys.run(projectKey, id), run);
    return run;
  });
}
