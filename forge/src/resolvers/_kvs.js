import { kvs, WhereConditions, ListResult } from '@forge/kvs';

// Chaves seguem convenção: <entity>:<projectKey|global>:<id>
export const keys = {
  testCase: (projectKey, id) => `tc:${projectKey}:${id}`,
  testCaseVersion: (projectKey, id, v) => `tc:${projectKey}:${id}:v${v}`,
  sharedStep: (id) => `ss:global:${id}`,
  testPlan: (projectKey, id) => `tp:${projectKey}:${id}`,
  run: (projectKey, id) => `run:${projectKey}:${id}`,
  folder: (projectKey, id) => `folder:${projectKey}:${id}`,
};

export const genId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function listByPrefix(prefix) {
  const results = [];
  let cursor;
  do {
    const page = await kvs
      .query()
      .where('key', WhereConditions.beginsWith(prefix))
      .limit(100)
      .cursor(cursor)
      .getMany();
    results.push(...page.results.map((r) => r.value));
    cursor = page.nextCursor;
  } while (cursor);
  return results;
}

export { kvs };
