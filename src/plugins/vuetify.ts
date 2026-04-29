import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: { dark: false },
      dark: { dark: true },
    },
  },
  defaults: {
    global: { density: 'comfortable' },
    VBtn: { variant: 'text' },
  },
})
