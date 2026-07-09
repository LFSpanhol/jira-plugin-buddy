import Resolver from '@forge/resolver';
import { registerTestCaseHandlers } from './resolvers/testcases.js';
import { registerSharedStepHandlers } from './resolvers/sharedSteps.js';
import { registerTestPlanHandlers } from './resolvers/testplans.js';
import { registerRunHandlers } from './resolvers/runs.js';
import { registerJiraHandlers } from './resolvers/jiraApi.js';

const resolver = new Resolver();

registerTestCaseHandlers(resolver);
registerSharedStepHandlers(resolver);
registerTestPlanHandlers(resolver);
registerRunHandlers(resolver);
registerJiraHandlers(resolver);

export const handler = resolver.getDefinitions();
