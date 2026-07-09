import ForgeReact, {
  Box,
  Button,
  Heading,
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

const emptyStep = () => ({ action: '', expected: '' });

const SharedStepsLibrary = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    invoke('ss.list').then((r) => {
      setItems(r ?? []);
      setLoading(false);
    });

  useEffect(() => {
    refresh();
  }, []);

  const openNew = () =>
    setEditing({ title: '', description: '', steps: [emptyStep()] });

  const save = async () => {
    await invoke('ss.save', { sharedStep: editing });
    setEditing(null);
    refresh();
  };

  const remove = async (id) => {
    await invoke('ss.delete', { id });
    refresh();
  };

  return (
    <Stack space="space.200">
      <Inline space="space.100" alignBlock="center">
        <Heading as="h1">Steps Compartilhados</Heading>
        <Button appearance="primary" onClick={openNew}>
          Novo bloco
        </Button>
      </Inline>
      <Text>
        Blocos de steps reutilizáveis (login, checkout, setup) que podem ser
        referenciados por qualquer test case.
      </Text>

      {loading && <Text>Carregando…</Text>}
      {!loading && !items.length && <Text>Nenhum bloco criado ainda.</Text>}

      {items.map((it) => (
        <Box
          key={it.id}
          padding="space.150"
          backgroundColor="color.background.neutral"
        >
          <Inline space="space.100" alignBlock="center">
            <Text>
              <strong>{it.title}</strong> · v{it.version} · {it.steps.length}{' '}
              step(s)
            </Text>
            <Button onClick={() => setEditing(it)}>Editar</Button>
            <Button appearance="danger" onClick={() => remove(it.id)}>
              Excluir
            </Button>
          </Inline>
        </Box>
      ))}

      <ModalTransition>
        {editing && (
          <Modal onClose={() => setEditing(null)} width="large">
            <ModalHeader>
              <ModalTitle>
                {editing.id ? 'Editar bloco' : 'Novo bloco'}
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
                  placeholder="Descrição / quando usar"
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
                {editing.steps.map((s, i) => (
                  <Inline key={i} space="space.100">
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
                Salvar
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </Stack>
  );
};

export default SharedStepsLibrary;
