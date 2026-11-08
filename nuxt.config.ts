import tailwindcss from "@tailwindcss/vite";
import packageJson from "./package.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2024-11-01',

	modules: [
		'@nuxt/fonts',
		'@nuxtjs/color-mode',
		'@nuxt/icon',
	],

	rootDir: 'src/',
	ssr: false,
	devtools: { enabled: false },
	devServer: {
		port: 5002,
	},
	nitro: {
		preset: "bun",
		// Bundle shared field definitions for both dev workers and production.
		externals: { inline: [/\/shared\/(?:noteStatuses|startupMatrix)\.js$/] },
	},

	runtimeConfig: {
		sqlitePath: './.data/dashhack.sqlite',
        xBearerToken: '',
        githubAppId: '',
        githubAppClientId: '',
        githubAppClientSecret: '',
        githubAppPrivateKey: '',
        githubAppSlug: '',
        githubAppBaseUrl: '',
		public: {
			appVersion: packageJson.version,
			buildTimestamp: new Date().toISOString(),
			color: "#3081E0",
			discordInvite: process.env.discord,
		},
	},

    routeRules: { '/github/callback': { headers: { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' } } },


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
		"~/assets/css/main.css",
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
