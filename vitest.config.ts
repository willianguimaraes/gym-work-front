import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Testes unitários (utilitários, serviços e stores), sem o plugin do Quasar nem o PWA. */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    restoreMocks: true,
  },
})
