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
| `/` | Início (planejamento ativo) |
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
| `/planos` | Lista de planejamentos |
| `/planos/:id` | Planejamento: fases, ativar, duplicar, concluir, arquivar, excluir |
| `/fases/:id` | Fase: semanas (deload), dias de treino, reordenar, duplicar |
| `/dias/:id` | Dia de treino: exercícios com séries/reps/descanso/carga/RIR, reordenar, substituir |
| `/exercicios` | Catálogo com busca e filtros |
| `/exercicios/:id` | Exercício: aba Evolução (última, melhor, análise, gráfico, histórico, observações, regra de progressão) e Detalhes |
| `/exercicios/novo`, `/exercicios/:id/editar` | Exercício personalizado |
| `/perfil` | Perfil, sair e excluir conta |
| `/perfil/dados` | Nome, altura e data de nascimento |
| `/perfil/preferencias` | Tema, unidades (kg/lb, cm/pol), descanso padrão, som, fuso horário |
| `/perfil/senha` | Alterar senha |

## Treino sem internet

Cada série vai para a API na hora. Se a conexão cair com o app aberto, a série fica numa fila no navegador (ícone de nuvem na linha) e é enviada quando a API volta; o `clientId` de cada série impede duplicar. O cronômetro de descanso guarda o horário de término, então continua certo depois de recarregar a página. Reabrir o app totalmente sem internet ainda não é suportado (modo offline completo previsto para a Etapa 8).

## Fotos de evolução

Antes do envio, o app reduz a foto para no máximo 1600 px e a regrava em JPEG (`utils/image.ts`). O upload fica rápido no celular e os metadados da câmera são descartados, inclusive a localização GPS. As fotos são privadas: a API devolve links assinados que valem 5 minutos, e o app pede um novo link se o anterior vencer.

## Relatórios e pacote para IA

O texto do relatório segue o formato de acompanhamento (`FASE … / SEMANA … / SEG — UPPER / exercício: carga | reps`). "Copiar" funciona também pelo IP da rede (http), com o fallback do Quasar. Os downloads (TXT, PDF, CSV, .md, .json) vêm da API com o nome do arquivo e são salvos pelo `exportFile` do Quasar (`utils/files.ts`). No fim de uma fase, a aba **Pacote para IA** copia ou baixa tudo o que a IA precisa para avaliar a fase e devolver o próximo plano no template `gymwork.plan/v1`.

## Tema e unidades

O tema escuro é o padrão. Em **Perfil → Preferências** dá para trocar entre Escuro, Claro e Sistema; a escolha é salva na conta e também no navegador, para a tela de login já abrir no tema certo.

A API guarda sempre kg e cm; a conversão para lb e polegadas é feita só na exibição e na digitação (`utils/units.ts`), inclusive na carga sugerida dos exercícios do plano.
