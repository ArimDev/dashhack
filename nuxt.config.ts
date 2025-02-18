import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: [
    '@nuxt/fonts',
    '@nuxtjs/color-mode',
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
})