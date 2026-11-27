import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Em dev e no preview, /api é repassado ao backend: evita CORS e funciona também no celular.
  const apiProxy: Record<string, ProxyOptions> = {
    '/api': {
      target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
      changeOrigin: true,
      // O navegador envia Origin com o IP do PC (ex.: http://192.168.1.10:5173) quando aberto
      // no celular; o CORS do backend só libera localhost. Pelo proxy a chamada é de mesma
      // origem para o navegador, então o cabeçalho pode ser removido com segurança.
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
      },
    },
  }

  return {
    plugins: [
      vue({ template: { transformAssetUrls } }),
      quasar({
        sassVariables: fileURLToPath(new URL('./src/css/quasar-variables.scss', import.meta.url)),
      }),
      // PWA: instala no celular e abre sem internet (só a "casca" do app; a API nunca é cacheada).
      // O service worker só existe no build (npm run build / preview), não no dev.
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Gym Work',
          short_name: 'Gym Work',
          description: 'Acompanhamento de treinos, evolução e avaliações físicas',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#0d0f13',
          background_color: '#0d0f13',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // host: true permite abrir no celular pela rede local (http://<ip-do-pc>:5173)
      host: true,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      host: true,
      proxy: apiProxy,
    },
  }
})
