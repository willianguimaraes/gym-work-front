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
| `/mais` | Menu: planejamentos, catálogo, perfil |
| `/planos` | Lista de planejamentos |
| `/planos/:id` | Planejamento: fases, ativar, duplicar, concluir, arquivar, excluir |
| `/fases/:id` | Fase: semanas (deload), dias de treino, reordenar, duplicar |
| `/dias/:id` | Dia de treino: exercícios com séries/reps/descanso/carga/RIR, reordenar, substituir |
| `/exercicios` | Catálogo com busca e filtros |
| `/exercicios/novo`, `/exercicios/:id`, `/exercicios/:id/editar` | Exercício personalizado |
| `/perfil` | Perfil, sair e excluir conta |
| `/perfil/dados` | Nome, altura e data de nascimento |
| `/perfil/preferencias` | Tema, unidades (kg/lb, cm/pol), descanso padrão, som, fuso horário |
| `/perfil/senha` | Alterar senha |

## Treino sem internet

Cada série vai para a API na hora. Se a conexão cair com o app aberto, a série fica numa fila no navegador (ícone de nuvem na linha) e é enviada quando a API volta; o `clientId` de cada série impede duplicar. O cronômetro de descanso guarda o horário de término, então continua certo depois de recarregar a página. Reabrir o app totalmente sem internet ainda não é suportado (modo offline completo previsto para a Etapa 8).

## Tema e unidades

O tema escuro é o padrão. Em **Perfil → Preferências** dá para trocar entre Escuro, Claro e Sistema; a escolha é salva na conta e também no navegador, para a tela de login já abrir no tema certo.

A API guarda sempre kg e cm; a conversão para lb e polegadas é feita só na exibição e na digitação (`utils/units.ts`), inclusive na carga sugerida dos exercícios do plano.
