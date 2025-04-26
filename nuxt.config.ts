import tailwindcss from "@tailwindcss/vite";
import packageJson from "./package.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',
	devtools: { enabled: true },
	devServer: {
		port: 5002,
	},

	runtimeConfig: {
		mongoUri: process.env.mongoUri,
		public: {
			appVersion: packageJson.version,
			buildTimestamp: new Date().toISOString(),
		},
	},

	components: [
		{
			path: '~/components',
			pathPrefix: false,
		},
	],

	vite: {
		plugins: [
			tailwindcss(),
		],
	},

	icon: {
		serverBundle: 'remote',
		clientBundle: {
			icons: [
				'heroicons:magnifying-glass-plus-16-solid',
				'heroicons:magnifying-glass-minus-16-solid',
				'heroicons:arrows-pointing-out-16-solid',
				'heroicons:hand-raised-16-solid',
				'heroicons:arrow-path-16-solid',
			],
			scan: true,
		},
	},

	modules: ['@nuxt/fonts', '@nuxtjs/color-mode', '@nuxt/icon', 'nuxt-color-picker'],

	ssr: true,

	css: [
		"@/assets/style.css",
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
		classSuffix: '',
		storage: 'localStorage',
		storageKey: 'colorMode',
	},
})