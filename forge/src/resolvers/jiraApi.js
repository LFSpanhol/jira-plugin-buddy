import api, { route } from '@forge/api';
import { kvs, keys } from './_kvs.js';

/**
 * Handlers que tocam a API do Jira (criar bug a partir de um step falho,
 * listar casos vinculados a uma issue, etc).
 */
export function registerJiraHandlers(resolver) {
  // Lista casos que citam esta issue (usado no issuePanel).
  // Convenção: em run.updateResult, quando bugKeys inclui a issueKey, indexamos aqui.
  resolver.define('issue.linkedCases', async ({ payload }) => {
    const { projectKey, issueKey } = payload;
    const runs = await import('./_kvs.js').then((m) =>
      m.listByPrefix(`run:${projectKey}:`),
    );
    const linked = [];
    for (const run of runs) {
      for (const r of run.results ?? []) {
        if (r.bugKeys?.includes(issueKey)) {
          const tc = await kvs.get(keys.testCase(projectKey, r.caseId));
          if (tc) linked.push({ testCase: tc, runId: run.id, status: r.status });
        }
      }
    }
    return linked;
  });

  // Cria um bug no Jira a partir de um step que falhou.
  resolver.define('issue.createBug', async ({ payload }) => {
    const { projectKey, summary, description, testCaseId, runId } = payload;

    const body = {
      fields: {
        project: { key: projectKey },
        issuetype: { name: 'Bug' },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description ?? '' }],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Origem: QAFlow · caso ${testCaseId} · run ${runId}`,
                },
              ],
            },
          ],
        },
      },
    };

    const res = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Falha ao criar bug: ${res.status} ${err}`);
    }
    return res.json();
  });
}
