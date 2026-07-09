# QAFlow — Plugin de QA para Jira Cloud

Gestão de casos de teste com **reuso**, **versionamento**, **planos**,
**execuções** e criação de bugs direto no Jira.

## Módulos instalados no Jira

| Módulo             | Onde aparece                          | O que faz                                            |
| ------------------ | ------------------------------------- | ---------------------------------------------------- |
| `jira:projectPage` | Barra lateral do projeto → **QAFlow** | Hub: casos, planos e execuções do projeto            |
| `jira:issuePanel`  | Painel dentro de uma issue            | Mostra os casos/execuções que geraram aquele bug     |
| `jira:globalPage`  | Menu **Apps** global                  | Biblioteca de **steps compartilhados** (reutilizáveis) |

## Modelo de dados (Forge KVS)

```
tc:{project}:{id}           → caso "cabeça" (versão atual)
tc:{project}:{id}:v{n}      → snapshot imutável de cada versão
ss:global:{id}              → step compartilhado (biblioteca global)
tp:{project}:{id}           → test plan (referencia caso + versão fixada)
run:{project}:{id}          → execução (resultados por caso/step + bugs criados)
```

### Como o reuso funciona

- **Biblioteca central**: casos vivem por `projectKey` e são *referenciados*
  (não copiados) pelos planos.
- **Steps compartilhados**: em cada step do caso, um dropdown permite apontar
  para um bloco global. Na execução o bloco é expandido inline.
- **Versionamento**: cada `Salvar` cria um novo snapshot `v{n}` — planos e
  execuções guardam a versão exata usada, mantendo o histórico reproduzível.
- **Clonar/parametrizar**: botão `Clonar` cria um novo caso independente. O
  campo `parameters` renderiza placeholders `{{nome}}` nos steps.

## Como publicar (na sua máquina)

Pré-requisitos: Node 22+ e uma conta Atlassian com permissão no site Jira.

```bash
cd forge
npm install -g @forge/cli
forge login                    # 1x — cola um API token da Atlassian
forge register                 # 1x — gera o app id e atualiza o manifest.yml
forge deploy                   # publica no ambiente 'development'
forge install --site sua-empresa.atlassian.net --product jira
```

Iterações depois:

```bash
forge deploy && forge install --upgrade --site sua-empresa.atlassian.net --product jira
# ou, durante desenvolvimento com hot-reload:
forge tunnel
```

## Estrutura

```
forge/
  manifest.yml
  package.json
  src/
    index.js                       # entrypoint dos resolvers
    resolvers/
      _kvs.js                      # helpers de storage
      testcases.js                 # CRUD + versionamento + clone
      sharedSteps.js               # biblioteca global
      testplans.js                 # planos + caseRefs versionados
      runs.js                      # execução, resultados, evidências
      jiraApi.js                   # criar bug, listar casos vinculados
    frontend/
      QAHub.jsx                    # projectPage (abas Casos/Planos/Execuções)
      IssuePanel.jsx               # painel na issue
      SharedStepsLibrary.jsx       # globalPage
      components/
        CasesTab.jsx
        PlansTab.jsx
        RunsTab.jsx
```

## Próximos passos sugeridos (fora do MVP)

- Anexo de evidências via `@forge/bridge` `uploadAttachment` (Jira attachments).
- Vincular caso a Story/Epic via `issue.linkedCases` reverso + `issueLinks`.
- Exportação/importação CSV para migrar do Confluence.
- Métricas (pass-rate por sprint, flaky tests) em uma aba de Dashboard.
- Papéis: separar QA lead / executor com `visibility` no manifest.
