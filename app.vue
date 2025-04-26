<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script setup>
if (import.meta.client) {
	const config = useRuntimeConfig();

	console.log(
		`%c🛡️ DashHack v${config.public.appVersion} 🛡️`,
		"color: #38bdf8; font-size: 24px; font-weight: bold; text-shadow: 0 0 5px #0ea5e9;"
	);

	console.log(
		`%c🔧 Development Info`,
		"color:  #38bdf8; font-size: 16px; font-weight: bold; margin-top: 10px;"
	);

	console.log(
		`%cDev mode: %c${import.meta.dev}`,
		"color: #38bdf8; font-weight: bold;",
		"color: #f87171; font-weight: bold;"
	);

	console.log(
		`%cLogged in: %c${!!useCookie("sessionExists").value}`,
		"color: #38bdf8; font-weight: bold;",
		"color: #f87171; font-weight: bold;"
	);

	console.log(
		`%cColor mode: %c${useColorMode().value}`,
		"color: #38bdf8; font-weight: bold;",
		"color: #f87171; font-weight: bold;"
	);

	console.log(
		`%cBuild time: %c${new Date(config.public.buildTimestamp).toLocaleString()}`,
		"color: #38bdf8; font-weight: bold;",
		"color: #f87171; font-weight: bold;"
	);

}
</script>