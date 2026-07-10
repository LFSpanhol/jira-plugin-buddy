import api, { route } from '@forge/api';

/**
 * Autorização: garante que o usuário chamador tem acesso ao projeto
 * informado. Sem isso, qualquer usuário logado no site poderia ler/escrever
 * dados de projetos que não deveria ver.
 *
 * Estratégia: consulta /mypermissions com BROWSE_PROJECTS no projectKey.
 * Se não tiver, lança erro que o Forge converte em falha do resolver.
 */
const permCache = new Map(); // chave: `${accountId}:${projectKey}:${perm}`
const TTL_MS = 30_000;

async function hasPermission(accountId, projectKey, permission) {
  const cacheKey = `${accountId}:${projectKey}:${permission}`;
  const cached = permCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const res = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/mypermissions?projectKey=${projectKey}&permissions=${permission}`,
      { headers: { Accept: 'application/json' } },
    );
  if (!res.ok) return false;
  const body = await res.json();
  const value = !!body?.permissions?.[permission]?.havePermission;
  permCache.set(cacheKey, { value, expires: Date.now() + TTL_MS });
  return value;
}

export async function assertProjectAccess(context, projectKey, mode = 'read') {
  if (!projectKey || typeof projectKey !== 'string') {
    throw new Error('projectKey obrigatório');
  }
  const accountId = context?.accountId;
  if (!accountId) throw new Error('Não autenticado');

  const perm = mode === 'write' ? 'CREATE_ISSUES' : 'BROWSE_PROJECTS';
  const ok = await hasPermission(accountId, projectKey, perm);
  if (!ok) {
    throw new Error(
      `Acesso negado ao projeto ${projectKey} (permissão ${perm}).`,
    );
  }
  return accountId;
}

/**
 * Isolamento por tenant: recusa registros cujo projectKey interno não bate
 * com o projectKey do request (defesa em profundidade caso alguém passe um
 * id de outro projeto).
 */
export function assertSameProject(record, projectKey) {
  if (!record) return;
  if (record.projectKey && record.projectKey !== projectKey) {
    throw new Error('Registro pertence a outro projeto.');
  }
}
