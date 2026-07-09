import { kvs, keys, genId, listByPrefix } from './_kvs.js';

/**
 * TestCase (versão atual salva em tc:{project}:{id}; snapshots em tc:{project}:{id}:v{n}).
 * Formato:
 * {
 *   id, projectKey, title, tags: [], folderId, parameters: {},
 *   currentVersion: number, createdAt, updatedAt, createdBy,
 *   preconditions, steps: [{ id, action, expected, sharedStepRef? }]
 * }
 */
export function registerTestCaseHandlers(resolver) {
  resolver.define('tc.list', async ({ payload }) => {
    const { projectKey } = payload;
    const items = await listByPrefix(`tc:${projectKey}:`);
    // filtra somente registros "cabeça" (sem :v na chave)
    return items.filter((it) => it && it.currentVersion !== undefined);
  });

  resolver.define('tc.get', async ({ payload }) => {
    const { projectKey, id, version } = payload;
    const head = await kvs.get(keys.testCase(projectKey, id));
    if (!head) return null;
    if (version && version !== head.currentVersion) {
      const snap = await kvs.get(keys.testCaseVersion(projectKey, id, version));
      return snap ? { ...head, ...snap } : head;
    }
    return head;
  });

  resolver.define('tc.save', async ({ payload, context }) => {
    const { projectKey, testCase } = payload;
    const now = new Date().toISOString();
    const userId = context?.accountId ?? 'unknown';

    const isNew = !testCase.id;
    const id = testCase.id ?? genId();
    const prev = isNew ? null : await kvs.get(keys.testCase(projectKey, id));
    const nextVersion = (prev?.currentVersion ?? 0) + 1;

    const head = {
      id,
      projectKey,
      title: testCase.title,
      tags: testCase.tags ?? [],
      folderId: testCase.folderId ?? null,
      parameters: testCase.parameters ?? {},
      preconditions: testCase.preconditions ?? '',
      steps: testCase.steps ?? [],
      currentVersion: nextVersion,
      createdAt: prev?.createdAt ?? now,
      createdBy: prev?.createdBy ?? userId,
      updatedAt: now,
      updatedBy: userId,
    };

    // snapshot imutável
    await kvs.set(keys.testCaseVersion(projectKey, id, nextVersion), {
      version: nextVersion,
      steps: head.steps,
      preconditions: head.preconditions,
      parameters: head.parameters,
      savedAt: now,
      savedBy: userId,
    });
    await kvs.set(keys.testCase(projectKey, id), head);
    return head;
  });

  resolver.define('tc.clone', async ({ payload, context }) => {
    const { projectKey, sourceId, overrides } = payload;
    const src = await kvs.get(keys.testCase(projectKey, sourceId));
    if (!src) throw new Error('Test case não encontrado');
    const clone = {
      ...src,
      id: undefined,
      title: overrides?.title ?? `${src.title} (cópia)`,
      parameters: { ...src.parameters, ...(overrides?.parameters ?? {}) },
    };
    // reusa o save
    const now = new Date().toISOString();
    const userId = context?.accountId ?? 'unknown';
    const id = genId();
    const head = {
      ...clone,
      id,
      currentVersion: 1,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
    };
    await kvs.set(keys.testCaseVersion(projectKey, id, 1), {
      version: 1,
      steps: head.steps,
      preconditions: head.preconditions,
      parameters: head.parameters,
      savedAt: now,
      savedBy: userId,
    });
    await kvs.set(keys.testCase(projectKey, id), head);
    return head;
  });

  resolver.define('tc.delete', async ({ payload }) => {
    const { projectKey, id } = payload;
    const head = await kvs.get(keys.testCase(projectKey, id));
    if (!head) return { ok: true };
    for (let v = 1; v <= head.currentVersion; v++) {
      await kvs.delete(keys.testCaseVersion(projectKey, id, v)).catch(() => {});
    }
    await kvs.delete(keys.testCase(projectKey, id));
    return { ok: true };
  });
}
