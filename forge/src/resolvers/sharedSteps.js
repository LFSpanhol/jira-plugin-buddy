import { kvs, keys, genId, listByPrefix } from './_kvs.js';

/**
 * Shared step (biblioteca global de blocos reutilizáveis):
 * { id, title, description, steps: [{ action, expected }], version, updatedAt }
 */
export function registerSharedStepHandlers(resolver) {
  resolver.define('ss.list', async () => {
    return listByPrefix('ss:global:');
  });

  resolver.define('ss.get', async ({ payload }) => {
    return kvs.get(keys.sharedStep(payload.id));
  });

  resolver.define('ss.save', async ({ payload, context }) => {
    const { sharedStep } = payload;
    const now = new Date().toISOString();
    const userId = context?.accountId ?? 'unknown';
    const id = sharedStep.id ?? genId();
    const prev = sharedStep.id ? await kvs.get(keys.sharedStep(id)) : null;
    const record = {
      id,
      title: sharedStep.title,
      description: sharedStep.description ?? '',
      steps: sharedStep.steps ?? [],
      version: (prev?.version ?? 0) + 1,
      updatedAt: now,
      updatedBy: userId,
    };
    await kvs.set(keys.sharedStep(id), record);
    return record;
  });

  resolver.define('ss.delete', async ({ payload }) => {
    await kvs.delete(keys.sharedStep(payload.id));
    return { ok: true };
  });
}
