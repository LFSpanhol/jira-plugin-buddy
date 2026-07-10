import { kvs, keys, genId, listByPrefix } from './_kvs.js';
import { validateSharedStep } from './_validate.js';
import { idStr } from './_validate.js';

/**
 * Biblioteca global de blocos reutilizáveis. Qualquer usuário logado no site
 * pode listar/consumir (é global por design). Escrita exige usuário autenticado.
 */
export function registerSharedStepHandlers(resolver) {
  resolver.define('ss.list', async ({ context }) => {
    if (!context?.accountId) throw new Error('Não autenticado');
    return listByPrefix('ss:global:');
  });

  resolver.define('ss.get', async ({ payload, context }) => {
    if (!context?.accountId) throw new Error('Não autenticado');
    const id = idStr('id', payload.id);
    return kvs.get(keys.sharedStep(id));
  });

  resolver.define('ss.save', async ({ payload, context }) => {
    if (!context?.accountId) throw new Error('Não autenticado');
    const ss = validateSharedStep(payload.sharedStep);
    const now = new Date().toISOString();
    const userId = context.accountId;
    const id = ss.id ?? genId();
    const prev = ss.id ? await kvs.get(keys.sharedStep(id)) : null;
    const record = {
      id,
      title: ss.title,
      description: ss.description,
      steps: ss.steps,
      version: (prev?.version ?? 0) + 1,
      updatedAt: now,
      updatedBy: userId,
    };
    await kvs.set(keys.sharedStep(id), record);
    return record;
  });

  resolver.define('ss.delete', async ({ payload, context }) => {
    if (!context?.accountId) throw new Error('Não autenticado');
    const id = idStr('id', payload.id);
    await kvs.delete(keys.sharedStep(id));
    return { ok: true };
  });
}
