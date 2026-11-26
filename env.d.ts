/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API. Vazio em dev (usa o proxy do Vite); em produção, ex.: https://api.gymwork.com */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
