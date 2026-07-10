import api, { route } from '@forge/api';
import { kvs, keys, listByPrefix } from './_kvs.js';
import { assertProjectAccess, assertSameProject } from './_auth.js';
import {
  projectKey as vProjectKey,
  idStr,
  str,
  validateBugPayload,
} from './_validate.js';

export function registerJiraHandlers(resolver) {
  resolver.define('issue.linkedCases', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const issueKey = str('issueKey', payload.issueKey, { max: 64 });
    await assertProjectAccess(context, projectKey, 'read');

    const runs = await listByPrefix(`run:${projectKey}:`);
    const linked = [];
    for (const run of runs) {
      if (!run || run.projectKey !== projectKey) continue;
      for (const r of run.results ?? []) {
        if (r.bugKeys?.includes(issueKey)) {
          const tc = await kvs.get(keys.testCase(projectKey, r.caseId));
          if (tc && tc.projectKey === projectKey) {
            linked.push({ testCase: tc, runId: run.id, status: r.status });
          }
        }
      }
    }
    return linked;
  });

  resolver.define('issue.createBug', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    await assertProjectAccess(context, projectKey, 'write');
    const { summary, description, testCaseId, runId } = validateBugPayload(payload);

    // Confirma que caso e run pertencem ao projeto (evita spoofing)
    const tc = await kvs.get(keys.testCase(projectKey, testCaseId));
    if (!tc) throw new Error('Caso não encontrado no projeto.');
    assertSameProject(tc, projectKey);
    const run = await kvs.get(keys.run(projectKey, runId));
    if (!run) throw new Error('Execução não encontrada no projeto.');
    assertSameProject(run, projectKey);

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
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Falha ao criar bug: ${res.status} ${err}`);
    }
    return res.json();
  });
}
