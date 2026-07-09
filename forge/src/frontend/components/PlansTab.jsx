import ForgeReact, {
  Box,
  Button,
  Checkbox,
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
  useState,
  useEffect,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const PlansTab = ({ projectKey }) => {
  const [plans, setPlans] = useState([]);
  const [cases, setCases] = useState([]);
  const [editing, setEditing] = useState(null);

  const refresh = () =>
    Promise.all([
      invoke('tp.list', { projectKey }),
      invoke('tc.list', { projectKey }),
    ]).then(([p, c]) => {
      setPlans(p ?? []);
      setCases(c ?? []);
    });

  useEffect(() => {
    refresh();
  }, [projectKey]);

  const openNew = () =>
    setEditing({ name: '', sprint: '', description: '', caseRefs: [] });

  const toggleCase = (c) => {
    const exists = editing.caseRefs.find((r) => r.caseId === c.id);
    const caseRefs = exists
      ? editing.caseRefs.filter((r) => r.caseId !== c.id)
      : [...editing.caseRefs, { caseId: c.id, version: c.currentVersion }];
    setEditing({ ...editing, caseRefs });
  };

  const save = async () => {
    await invoke('tp.save', { projectKey, plan: editing });
    setEditing(null);
    refresh();
  };

  const startRun = async (planId) => {
    await invoke('run.start', { projectKey, planId });
    alert('Execução iniciada — veja na aba Execuções.');
  };

  return (
    <Stack space="space.150">
      <Inline space="space.100" alignBlock="center">
        <Button appearance="primary" onClick={openNew}>
          Novo plano
        </Button>
        <Text>{plans.length} plano(s)</Text>
      </Inline>

      {plans.map((p) => (
        <Box
          key={p.id}
          padding="space.150"
          backgroundColor="color.background.neutral"
        >
          <Inline space="space.100" alignBlock="center">
            <Text>
              <strong>{p.name}</strong>
              {p.sprint ? ` · sprint ${p.sprint}` : ''} · {p.caseRefs.length}{' '}
              caso(s)
            </Text>
            <Button onClick={() => setEditing(p)}>Editar</Button>
            <Button appearance="primary" onClick={() => startRun(p.id)}>
              Iniciar execução
            </Button>
          </Inline>
        </Box>
      ))}

      <ModalTransition>
        {editing && (
          <Modal onClose={() => setEditing(null)} width="large">
            <ModalHeader>
              <ModalTitle>{editing.id ? 'Editar plano' : 'Novo plano'}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Stack space="space.150">
                <Textfield
                  placeholder="Nome"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
                <Textfield
                  placeholder="Sprint / release"
                  value={editing.sprint ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, sprint: e.target.value })
                  }
                />
                <TextArea
                  placeholder="Descrição"
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
                <Text>
                  <strong>Selecione os casos</strong> (a versão atual será
                  fixada no plano):
                </Text>
                {cases.map((c) => {
                  const checked = !!editing.caseRefs.find(
                    (r) => r.caseId === c.id,
                  );
                  return (
                    <Checkbox
                      key={c.id}
                      isChecked={checked}
                      onChange={() => toggleCase(c)}
                      label={`${c.title} (v${c.currentVersion})`}
                    />
                  );
                })}
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setEditing(null)}>Cancelar</Button>
              <Button appearance="primary" onClick={save}>
                Salvar
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </Stack>
  );
};

export default PlansTab;
