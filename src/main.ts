import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Loading, Dialog } from 'quasar'
import quasarLang from 'quasar/lang/pt-BR'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/app.scss'

import App from './App.vue'
import router from './router'
import { getStoredTheme, toQuasarDark } from './utils/theme'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Quasar, {
  plugins: { Notify, Loading, Dialog },
  lang: quasarLang,
  config: {
    // Tema escuro por padrão; o usuário pode trocar em Perfil
    dark: toQuasarDark(getStoredTheme()),
    notify: { position: 'top', timeout: 2500 },
  },
})

app.mount('#app')
