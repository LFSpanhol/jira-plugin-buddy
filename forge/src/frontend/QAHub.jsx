import ForgeReact, {
  Box,
  Button,
  Heading,
  Inline,
  Stack,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  Text,
  useProductContext,
  useState,
  useEffect,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import CasesTab from './components/CasesTab.jsx';
import PlansTab from './components/PlansTab.jsx';
import RunsTab from './components/RunsTab.jsx';

const QAHub = () => {
  const ctx = useProductContext();
  const projectKey = ctx?.extension?.project?.key;

  if (!projectKey) {
    return <Text>Carregando contexto do projeto…</Text>;
  }

  return (
    <Stack space="space.200">
      <Heading as="h1">QAFlow</Heading>
      <Text>
        Gestão de qualidade do projeto <strong>{projectKey}</strong>: casos
        reutilizáveis, planos e execuções.
      </Text>

      <Tabs id="qaflow-tabs">
        <TabList>
          <Tab>Casos de Teste</Tab>
          <Tab>Planos</Tab>
          <Tab>Execuções</Tab>
        </TabList>
        <TabPanel>
          <CasesTab projectKey={projectKey} />
        </TabPanel>
        <TabPanel>
          <PlansTab projectKey={projectKey} />
        </TabPanel>
        <TabPanel>
          <RunsTab projectKey={projectKey} />
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

export default QAHub;
