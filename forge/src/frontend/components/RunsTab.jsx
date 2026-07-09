import ForgeReact, {
  Box,
  Button,
  Inline,
  Lozenge,
  Stack,
  Text,
  Textfield,
  TextArea,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
  Select,
  useState,
  useEffect,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const STATUS = ['pending', 'pass', 'fail', 'blocked', 'skipped'];

const RunsTab = ({ projectKey }) => {
  const [runs, setRuns] = useState([]);
  const [cases, setCases] = useState({});
  const [openRun, setOpenRun] = useState(null);
  const [bugModal, setBugModal] = useState(null);

  const refresh = () =>
    Promise.all([
      invoke('run.list', { projectKey }),
      invoke('tc.list', { projectKey }),
    ]).then(([r, c]) => {
      setRuns(r ?? []);
      setCases(Object.fromEntries((c ?? []).map((tc) => [tc.id, tc])));
    });

  useEffect(() => {
    refresh();
  }, [projectKey]);

  const setStatus = async (run, caseId, status) => {
    const updated = await invoke('run.updateResult', {
      projectKey,
      id: run.id,
      caseId,
      patch: { status },
    });
    setOpenRun(updated);
    refresh();
  };

  const finish = async (run) => {
    await invoke('run.finish', { projectKey, id: run.id });
    setOpenRun(null);
    refresh();
  };

  const createBug = async () => {
    const { run, caseId, summary, description } = bugModal;
    const bug = await invoke('issue.createBug', {
      projectKey,
      summary,
      description,
      testCaseId: caseId,
      runId: run.id,
    });
    const current = run.results.find((r) => r.caseId === caseId);
    await invoke('run.updateResult', {
      projectKey,
      id: run.id,
      caseId,
      patch: {
        status: 'fail',
        bugKeys: [...(current.bugKeys ?? []), bug.key],
      },
    });
    setBugModal(null);
    refresh();
  };

  return (
    <Stack space="space.150">
      <Text>{runs.length} execução(ões)</Text>
      {runs.map((r) => (
        <Box
          key={r.id}
          padding="space.150"
          backgroundColor="color.background.neutral"
        >
          <Inline space="space.100" alignBlock="center">
            <Lozenge appearance={r.status === 'finished' ? 'success' : 'inprogress'}>
              {r.status}
            </Lozenge>
            <Text>
              Plano <strong>{r.planId}</strong> · {r.results.length} caso(s) ·
              iniciado em {new Date(r.startedAt).toLocaleString('pt-BR')}
            </Text>
            <Button onClick={() => setOpenRun(r)}>Abrir</Button>
          </Inline>
        </Box>
      ))}

      <ModalTransition>
        {openRun && (
          <Modal onClose={() => setOpenRun(null)} width="x-large">
            <ModalHeader>
              <ModalTitle>Execução {openRun.id}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Stack space="space.150">
                {openRun.results.map((res) => {
                  const tc = cases[res.caseId];
                  return (
                    <Box
                      key={res.caseId}
                      padding="space.100"
                      backgroundColor="color.background.input"
                    >
                      <Stack space="space.100">
                        <Text>
                          <strong>{tc?.title ?? res.caseId}</strong> · v
                          {res.version}
                        </Text>
                        <Inline space="space.100">
                          {STATUS.map((s) => (
                            <Button
                              key={s}
                              appearance={res.status === s ? 'primary' : 'default'}
                              onClick={() => setStatus(openRun, res.caseId, s)}
                            >
                              {s}
                            </Button>
                          ))}
                          <Button
                            appearance="warning"
                            onClick={() =>
                              setBugModal({
                                run: openRun,
                                caseId: res.caseId,
                                summary: `[QAFlow] Falha em: ${tc?.title ?? res.caseId}`,
                                description: '',
                              })
                            }
                          >
                            Criar bug
                          </Button>
                        </Inline>
                        {res.bugKeys?.length > 0 && (
                          <Text>Bugs: {res.bugKeys.join(', ')}</Text>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setOpenRun(null)}>Fechar</Button>
              {openRun.status !== 'finished' && (
                <Button appearance="primary" onClick={() => finish(openRun)}>
                  Finalizar execução
                </Button>
              )}
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      <ModalTransition>
        {bugModal && (
          <Modal onClose={() => setBugModal(null)}>
            <ModalHeader>
              <ModalTitle>Criar bug a partir da execução</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Stack space="space.150">
                <Textfield
                  value={bugModal.summary}
                  onChange={(e) =>
                    setBugModal({ ...bugModal, summary: e.target.value })
                  }
                />
                <TextArea
                  placeholder="Descrição / passos para reproduzir"
                  value={bugModal.description}
                  onChange={(e) =>
                    setBugModal({ ...bugModal, description: e.target.value })
                  }
                />
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setBugModal(null)}>Cancelar</Button>
              <Button appearance="primary" onClick={createBug}>
                Criar no Jira
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </Stack>
  );
};

export default RunsTab;
