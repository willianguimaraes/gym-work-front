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

## Tema

O tema escuro é o padrão. Em **Perfil** dá para trocar entre Escuro, Claro e Sistema; a escolha fica salva no navegador.
