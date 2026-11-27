# gym-work-front

SPA do **Gym Work**: acompanhamento de treinos de musculação, pensada para uso no celular durante o treino.

A API fica em [gym-work-back](https://github.com/willianguimaraes/gym-work-back).

## Stack

| Item | Versão |
| --- | --- |
| Node.js | 22 |
| Vue | 3.5 (Composition API) |
| TypeScript | 6.0 |
| Vite | 8 |
| Quasar | 2 (via `@quasar/vite-plugin`) |
| Pinia | 4 |
| Vue Router | 5 |
| Axios | 1 |
| Chart.js | 4 (gráficos de evolução) |
| vite-plugin-pwa | 2 (app instalável e offline) |
| Vitest | 5 (testes unitários) |
| ESLint / Prettier | 10 / 3 |

## Como rodar

Com a API rodando em `http://localhost:8080`:

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. Em desenvolvimento, as chamadas a `/api` passam pelo proxy do Vite até o backend. Isso evita CORS e permite testar no celular pela rede local em `http://<ip-do-pc>:5173`.

> O `.npmrc` deste projeto aponta para o registro público do npm.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos + build de produção |
| `npm run type-check` | Só a checagem de tipos |
| `npm run lint` | ESLint com correção automática |
| `npm run format` | Prettier |
| `npm test` | Testes unitários (Vitest) |
| `npm run preview` | Serve o build (com o service worker), também com o proxy `/api` |

## Configuração

Copie `.env.example` para `.env.local` se precisar mudar algo:

| Variável | Uso |
| --- | --- |
| `VITE_API_URL` | URL da API em produção. Vazio em desenvolvimento (usa o proxy). |
| `VITE_API_PROXY_TARGET` | Destino do proxy em desenvolvimento (padrão `http://localhost:8080`). |

## Sessão

- O token de acesso fica **só em memória** (nunca no `localStorage`).
- Ao abrir ou recarregar o app, a sessão é restaurada chamando `/api/auth/refresh`; o navegador envia sozinho o cookie `HttpOnly` de refresh, que o JavaScript não consegue ler.
- Quando a API responde 401, o `services/api.ts` renova o token uma vez e repete a requisição. Renovações simultâneas são agrupadas, e entre abas são serializadas com a Web Locks API.

## Telas

| Rota | Tela |
| --- | --- |
| `/login`, `/cadastro` | Login e cadastro |
| `/esqueci-senha`, `/redefinir-senha?token=…` | Recuperação de senha (link enviado por e-mail) |
| `/` | Início (dashboard): treino de hoje, plano/fase/semana, indicadores, exercícios por tendência, gráficos de carga, frequência, corpo e séries por grupo, últimos treinos e observações |
| `/treinar` | Retomar o treino em andamento ou iniciar o dia de hoje (ou treino avulso) |
| `/treino/:id` | Execução: séries com carga/reps pré-preenchidas, cronômetro, pular, substituir, observações, finalizar; também mostra treinos finalizados |
| `/historico` | Histórico de treinos |
| `/avaliacao` | Registro rápido de peso, gráficos de peso e medidas, lista de avaliações |
| `/avaliacao/nova`, `/avaliacao/:id/editar` | Avaliação: data, peso, gordura, altura, 12 medidas (todas opcionais) |
| `/avaliacao/:id` | Avaliação com medidas e fotos por posição |
| `/avaliacao/comparar` | Comparativo entre duas datas, com as fotos lado a lado |
| `/evolucao` | Exercícios em progresso, estáveis e em queda (por período ou fase), frequência e séries por grupo muscular |
| `/mais` | Menu: evolução, relatórios, planejamentos, catálogo, perfil |
| `/relatorios` | Relatórios: escolhe o planejamento e abre a fase, uma semana ou o pacote para IA; exporta o planejamento em JSON |
| `/relatorios/:escopo/:id` | Relatório de sessão, semana ou fase: copiar, baixar TXT/PDF/CSV, aba Análise e (fase) aba Pacote para IA |
| `/planos` | Lista de planejamentos e atalho para importar |
| `/planos/importar?planId=` | Importar planejamento (JSON `gymwork.plan/v1`): colar ou escolher o arquivo, ver problemas e a prévia, escolher os exercícios que não estão no catálogo e confirmar |
| `/planos/:id` | Planejamento: fases, ativar, duplicar, concluir, arquivar, excluir, exportar e importar fases (JSON) |
| `/fases/:id` | Fase: semanas (deload), dias de treino, reordenar, duplicar |
| `/dias/:id` | Dia de treino: exercícios com séries/reps/descanso/carga/RIR, reordenar, substituir |
| `/exercicios` | Catálogo com busca e filtros |
| `/exercicios/:id` | Exercício: aba Evolução (última, melhor, análise, gráfico, histórico, observações, regra de progressão) e Detalhes |
| `/exercicios/novo`, `/exercicios/:id/editar` | Exercício personalizado |
| `/perfil` | Perfil, sair e excluir conta |
| `/perfil/dados` | Nome, altura e data de nascimento |
| `/perfil/preferencias` | Tema, unidades (kg/lb, cm/pol), descanso padrão, som, fuso horário |
| `/perfil/senha` | Alterar senha |

## Treino sem internet e instalação (PWA)

Cada série vai para a API na hora. Se a conexão cair com o app aberto, a série fica numa fila no navegador (ícone de nuvem na linha) e é enviada quando a API volta; o `clientId` de cada série impede duplicar. O cronômetro de descanso guarda o horário de término, então continua certo depois de recarregar a página.

O build é um **PWA**: dá para instalar no celular ("Adicionar à tela inicial") e abrir **sem internet**. O service worker guarda só os arquivos do app; os dados da API nunca ficam em cache. Sem rede ao abrir, o app entra em modo sem conexão com o último usuário (só nome e e-mail ficam no aparelho), retoma o treino em andamento salvo no aparelho e reconecta sozinho quando a internet volta. Começar um treino novo precisa da API.

- O service worker só existe no build: teste com `npm run build` e `npm run preview`.
- Quando sai uma versão nova, o app avisa e só atualiza ao tocar em **Atualizar** (não recarrega no meio de um treino).
- Os ícones ficam em `public/icons` e são gerados por `python scripts/generate-icons.py`.
- No celular pela rede local (`http://<ip-do-pc>`), o navegador não instala PWA nem ativa o service worker (exige HTTPS, exceto em `localhost`). Em produção, com HTTPS, funciona normalmente.

## Fotos de evolução

Antes do envio, o app reduz a foto para no máximo 1600 px e a regrava em JPEG (`utils/image.ts`). O upload fica rápido no celular e os metadados da câmera são descartados, inclusive a localização GPS. As fotos são privadas: a API devolve links assinados que valem 5 minutos, e o app pede um novo link se o anterior vencer.

## Relatórios, pacote para IA e importação

O texto do relatório segue o formato de acompanhamento (`FASE … / SEMANA … / SEG — UPPER / exercício: carga | reps`). "Copiar" funciona também pelo IP da rede (http), com o fallback do Quasar. Os downloads (TXT, PDF, CSV, .md, .json) vêm da API com o nome do arquivo e são salvos pelo `exportFile` do Quasar (`utils/files.ts`). No fim de uma fase, a aba **Pacote para IA** copia ou baixa tudo o que a IA precisa para avaliar a fase e devolver o próximo plano no template `gymwork.plan/v1`. A resposta volta pelo botão **Importar a resposta da IA**, que abre a importação já apontando para o planejamento da fase: o app aceita o texto do chat como veio (com explicações e a cerca ```` ```json ````), mostra os problemas (e um texto pronto para pedir a correção à IA) e só grava depois da confirmação, sempre como algo novo (rascunho ou fases no fim do plano).

## Tema e unidades

O tema escuro é o padrão. Em **Perfil → Preferências** dá para trocar entre Escuro, Claro e Sistema; a escolha é salva na conta e também no navegador, para a tela de login já abrir no tema certo.

A API guarda sempre kg e cm; a conversão para lb e polegadas é feita só na exibição e na digitação (`utils/units.ts`), inclusive na carga sugerida dos exercícios do plano.
