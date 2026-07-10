import { kvs, keys, genId, listByPrefix } from './_kvs.js';
import { assertProjectAccess, assertSameProject } from './_auth.js';
import {
  projectKey as vProjectKey,
  idStr,
  enumOf,
  validateTestCase,
} from './_validate.js';

const SPEC_STATUSES = ['draft', 'review', 'approved', 'deprecated'];

/**
 * TestCase (versão atual em tc:{project}:{id}; snapshots em tc:{project}:{id}:v{n}).
 * Inclui specStatus: 'draft' | 'review' | 'approved' | 'deprecated'
 */
export function registerTestCaseHandlers(resolver) {
  resolver.define('tc.list', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    await assertProjectAccess(context, projectKey, 'read');
    const items = await listByPrefix(`tc:${projectKey}:`);
    return items.filter(
      (it) =>
        it && it.currentVersion !== undefined && it.projectKey === projectKey,
    );
  });

  resolver.define('tc.get', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    await assertProjectAccess(context, projectKey, 'read');
    const head = await kvs.get(keys.testCase(projectKey, id));
    if (!head) return null;
    assertSameProject(head, projectKey);
    if (payload.version && payload.version !== head.currentVersion) {
      const snap = await kvs.get(
        keys.testCaseVersion(projectKey, id, payload.version),
      );
      return snap ? { ...head, ...snap } : head;
    }
    return head;
  });

  resolver.define('tc.save', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const userId = await assertProjectAccess(context, projectKey, 'write');
    const testCase = validateTestCase(payload.testCase);
    const now = new Date().toISOString();

    const isNew = !testCase.id;
    const id = testCase.id ?? genId();
    const prev = isNew ? null : await kvs.get(keys.testCase(projectKey, id));
    if (prev) assertSameProject(prev, projectKey);
    const nextVersion = (prev?.currentVersion ?? 0) + 1;

    const head = {
      id,
      projectKey,
      title: testCase.title,
      tags: testCase.tags,
      folderId: prev?.folderId ?? null,
      parameters: testCase.parameters,
      preconditions: testCase.preconditions,
      steps: testCase.steps,
      specStatus: testCase.specStatus ?? prev?.specStatus ?? 'draft',
      currentVersion: nextVersion,
      createdAt: prev?.createdAt ?? now,
      createdBy: prev?.createdBy ?? userId,
      updatedAt: now,
      updatedBy: userId,
    };

    await kvs.set(keys.testCaseVersion(projectKey, id, nextVersion), {
      version: nextVersion,
      steps: head.steps,
      preconditions: head.preconditions,
      parameters: head.parameters,
      specStatus: head.specStatus,
      savedAt: now,
      savedBy: userId,
    });
    await kvs.set(keys.testCase(projectKey, id), head);
    return head;
  });

  resolver.define('tc.setStatus', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    const status = enumOf('specStatus', payload.status, SPEC_STATUSES);
    const userId = await assertProjectAccess(context, projectKey, 'write');
    const head = await kvs.get(keys.testCase(projectKey, id));
    if (!head) throw new Error('Caso não encontrado');
    assertSameProject(head, projectKey);
    head.specStatus = status;
    head.updatedAt = new Date().toISOString();
    head.updatedBy = userId;
    await kvs.set(keys.testCase(projectKey, id), head);
    return head;
  });

  resolver.define('tc.clone', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const sourceId = idStr('sourceId', payload.sourceId);
    const userId = await assertProjectAccess(context, projectKey, 'write');
    const src = await kvs.get(keys.testCase(projectKey, sourceId));
    if (!src) throw new Error('Test case não encontrado');
    assertSameProject(src, projectKey);
    const now = new Date().toISOString();
    const id = genId();
    const head = {
      ...src,
      id,
      projectKey,
      title: `${src.title} (cópia)`,
      specStatus: 'draft',
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
      specStatus: head.specStatus,
      savedAt: now,
      savedBy: userId,
    });
    await kvs.set(keys.testCase(projectKey, id), head);
    return head;
  });

  resolver.define('tc.delete', async ({ payload, context }) => {
    const projectKey = vProjectKey(payload.projectKey);
    const id = idStr('id', payload.id);
    await assertProjectAccess(context, projectKey, 'write');
    const head = await kvs.get(keys.testCase(projectKey, id));
    if (!head) return { ok: true };
    assertSameProject(head, projectKey);
    for (let v = 1; v <= head.currentVersion; v++) {
      await kvs.delete(keys.testCaseVersion(projectKey, id, v)).catch(() => {});
    }
    await kvs.delete(keys.testCase(projectKey, id));
    return { ok: true };
  });
}
