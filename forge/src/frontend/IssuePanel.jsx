import ForgeReact, {
  Stack,
  Heading,
  Text,
  Lozenge,
  Inline,
  useProductContext,
  useState,
  useEffect,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const statusColor = {
  pass: 'success',
  fail: 'removed',
  blocked: 'moved',
  skipped: 'default',
  pending: 'inprogress',
};

const IssuePanel = () => {
  const ctx = useProductContext();
  const projectKey = ctx?.extension?.project?.key;
  const issueKey = ctx?.extension?.issue?.key;
  const [linked, setLinked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectKey || !issueKey) return;
    invoke('issue.linkedCases', { projectKey, issueKey })
      .then(setLinked)
      .finally(() => setLoading(false));
  }, [projectKey, issueKey]);

  if (loading) return <Text>Buscando casos vinculados…</Text>;
  if (!linked.length)
    return <Text>Nenhum caso do QAFlow vinculado a esta issue.</Text>;

  return (
    <Stack space="space.150">
      <Heading as="h3">Casos de teste que geraram este bug</Heading>
      {linked.map((l) => (
        <Inline key={l.testCase.id + l.runId} space="space.100" alignBlock="center">
          <Lozenge appearance={statusColor[l.status] ?? 'default'}>
            {l.status}
          </Lozenge>
          <Text>
            <strong>{l.testCase.title}</strong> · v{l.testCase.currentVersion}
          </Text>
        </Inline>
      ))}
    </Stack>
  );
};

export default IssuePanel;
