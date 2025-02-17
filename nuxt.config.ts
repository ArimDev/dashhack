// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/fonts',
    '@nuxtjs/color-mode'
  ],

  ssr: true,

  css: [
    "@/assets/style.css"
  ],

  fonts: {
    provider: 'google',
    families: [
      { name: 'Public Sans', provider: 'google' },
    ],
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    storage: 'localStorage',
    classSuffix: '',
  },

  tailwindcss: {
    config: {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Public Sans', 'sans-serif'],
          },
          colors: {
            bluey: {
              50: '#e3f4ff',
              100: '#b3d9ff',
              200: '#80bfff',
              300: '#4da6ff',
              400: '#338ee6',
              500: '#3081E0',
              600: '#2a6bb3',
              700: '#24528d',
              800: '#1e4170',
              900: '#183357',
              950: '#0f1d3a',
            },
          },
        },
      },
    },
  },
})