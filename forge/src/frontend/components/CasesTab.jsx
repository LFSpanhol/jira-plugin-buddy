import ForgeReact, {
  Box,
  Button,
  Inline,
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

const emptyStep = () => ({
  id: Math.random().toString(36).slice(2, 8),
  action: '',
  expected: '',
  sharedStepRef: null,
});

const emptyCase = () => ({
  title: '',
  tags: [],
  preconditions: '',
  parameters: {},
  steps: [emptyStep()],
});

const CasesTab = ({ projectKey }) => {
  const [cases, setCases] = useState([]);
  const [sharedSteps, setSharedSteps] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    Promise.all([
      invoke('tc.list', { projectKey }),
      invoke('ss.list'),
    ]).then(([c, s]) => {
      setCases(c ?? []);
      setSharedSteps(s ?? []);
      setLoading(false);
    });

  useEffect(() => {
    refresh();
  }, [projectKey]);

  const save = async () => {
    await invoke('tc.save', { projectKey, testCase: editing });
    setEditing(null);
    refresh();
  };

  const clone = async (id) => {
    await invoke('tc.clone', { projectKey, sourceId: id });
    refresh();
  };

  const remove = async (id) => {
    await invoke('tc.delete', { projectKey, id });
    refresh();
  };

  return (
    <Stack space="space.150">
      <Inline space="space.100" alignBlock="center">
        <Button appearance="primary" onClick={() => setEditing(emptyCase())}>
          Novo caso
        </Button>
        <Text>{cases.length} caso(s) na biblioteca</Text>
      </Inline>

      {loading && <Text>Carregando…</Text>}

      {cases.map((c) => (
        <Box
          key={c.id}
          padding="space.150"
          backgroundColor="color.background.neutral"
        >
          <Inline space="space.100" alignBlock="center">
            <Text>
              <strong>{c.title}</strong> · v{c.currentVersion} · {c.steps.length}{' '}
              step(s)
            </Text>
            <Button onClick={() => setEditing(c)}>Editar</Button>
            <Button onClick={() => clone(c.id)}>Clonar</Button>
            <Button appearance="danger" onClick={() => remove(c.id)}>
              Excluir
            </Button>
          </Inline>
        </Box>
      ))}

      <ModalTransition>
        {editing && (
          <Modal onClose={() => setEditing(null)} width="x-large">
            <ModalHeader>
              <ModalTitle>
                {editing.id ? `Editar caso · v${editing.currentVersion}` : 'Novo caso'}
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Stack space="space.150">
                <Textfield
                  placeholder="Título"
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
                <TextArea
                  placeholder="Pré-condições"
                  value={editing.preconditions}
                  onChange={(e) =>
                    setEditing({ ...editing, preconditions: e.target.value })
                  }
                />
                <Text>
                  <strong>Steps</strong> (use {'{{parametro}}'} para
                  parametrizar)
                </Text>
                {editing.steps.map((s, i) => (
                  <Box
                    key={s.id}
                    padding="space.100"
                    backgroundColor="color.background.input"
                  >
                    <Stack space="space.100">
                      <Select
                        placeholder="Reutilizar step compartilhado (opcional)"
                        value={
                          s.sharedStepRef
                            ? { label: s.sharedStepRef, value: s.sharedStepRef }
                            : null
                        }
                        options={[
                          { label: '— nenhum —', value: '' },
                          ...sharedSteps.map((ss) => ({
                            label: `${ss.title} (v${ss.version})`,
                            value: ss.id,
                          })),
                        ]}
                        onChange={(opt) => {
                          const steps = [...editing.steps];
                          steps[i] = { ...s, sharedStepRef: opt?.value || null };
                          setEditing({ ...editing, steps });
                        }}
                      />
                      {!s.sharedStepRef && (
                        <Inline space="space.100">
                          <Textfield
                            placeholder={`Ação #${i + 1}`}
                            value={s.action}
                            onChange={(e) => {
                              const steps = [...editing.steps];
                              steps[i] = { ...s, action: e.target.value };
                              setEditing({ ...editing, steps });
                            }}
                          />
                          <Textfield
                            placeholder="Resultado esperado"
                            value={s.expected}
                            onChange={(e) => {
                              const steps = [...editing.steps];
                              steps[i] = { ...s, expected: e.target.value };
                              setEditing({ ...editing, steps });
                            }}
                          />
                        </Inline>
                      )}
                    </Stack>
                  </Box>
                ))}
                <Button
                  onClick={() =>
                    setEditing({
                      ...editing,
                      steps: [...editing.steps, emptyStep()],
                    })
                  }
                >
                  + Adicionar step
                </Button>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setEditing(null)}>Cancelar</Button>
              <Button appearance="primary" onClick={save}>
                Salvar (gera nova versão)
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </Stack>
  );
};

export default CasesTab;
