import tailwindcss from "@tailwindcss/vite";
import packageJson from "./package.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',

	modules: [
		'@nuxt/fonts',
		'@nuxtjs/color-mode',
		'@nuxt/icon',
		'nuxt-color-picker',
		'@nuxtjs/seo',
		'@nuxtjs/mdc',
	],

	rootDir: 'src/',
	ssr: true,
	devtools: { enabled: true },
	devServer: {
		port: 5002,
	},

	site: {
		url: process.env.url,
		name: 'DashHack',
	},
	runtimeConfig: {
		mongoUri: process.env.mongoUri || process.env.MONGO_URI_LOCAL || 'mongodb://mongo:27017/dashhack_dev',
		public: {
			appVersion: packageJson.version,
			buildTimestamp: new Date().toISOString(),
			color: "#3081E0",
			discordInvite: process.env.discord,
		},
	},

	seo: {
		automaticDefaults: false,
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

	css: [
		"/assets/css/main.css",
	],

	vite: {
		plugins: [
			tailwindcss(),
		],
	},

	components: [
		{
			path: '~/components',
			pathPrefix: false,
		},
	],
})