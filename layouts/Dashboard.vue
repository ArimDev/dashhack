<template>
	<div class="font-sans flex bg-zinc-300 dark:bg-gray-900 dark:text-white transition-colors duration-500">
		<sidebar class="fixed z-10 w-[15%] h-screen bg-white text-black p-[2%] min-h-screen min-w-[215px] flex flex-col items-center text-center content-center align-center">
			<header class="min-h-1/3 flex flex-col justify-center items-center">
				<NuxtLink to="/" class="min-h-1/3 flex flex-col justify-center items-center"><img src="/logo.png" width="60%"></NuxtLink>
				<h1 class="font-bold text-2xl">DashHack</h1>
			</header>
			<ul class="min-h-1/3 flex flex-col justify-center gap-9 w-full">
				<li class="text-left justify-center">
					<NuxtLink :to="getPath()" class="cursor-pointer px-4 py-2 flex gap-2 text-2xl font-bold text-left justify-start items-center rounded-full w-full transition-colors duration-500" :class="isActive(getPath()) ? 'bg-bluey-500 text-white' : 'hover:text-bluey-500'">
						<Icon name="ph:house-fill" size="40px" />
						Home
					</NuxtLink>
				</li>
				<li class="text-left justify-center items-center">
					<NuxtLink :to="getPath('teams')" class="cursor-pointer px-4 py-2 flex gap-2 text-2xl font-bold text-left justify-start items-center rounded-full w-full transition-colors duration-500" :class="isActive(getPath('teams')) ? 'bg-bluey-500 text-white' : 'hover:text-bluey-500'">
						<Icon name="fluent:people-team-20-filled" size="40px" />
						Teams
					</NuxtLink>
				</li>
				<li class="text-left justify-center">
					<NuxtLink :to="getPath('settings')" class="cursor-pointer px-4 py-2 flex gap-2 text-2xl font-bold text-left justify-start items-center rounded-full w-full transition-colors duration-500" :class="isActive(getPath('settings')) ? 'bg-bluey-500 text-white' : 'hover:text-bluey-500'">
						<Icon name="fluent:settings-28-filled" size="40px" />
						Settings
					</NuxtLink>
				</li>
			</ul>
			<footer class="min-h-1/3 flex flex-row justify-end items-end gap-3">
				<button class="cursor-pointer bg-bluey-500 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-500">
					<Icon name="octicon:law-16" size="23px" style="color: white" />
				</button>
				<button @click.prevent="darkMode" class="cursor-pointer bg-bluey-500 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-500">
					<Icon :name="colorMode.preference === 'light' ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'" size="23px" style="color: white" />
				</button>
				<button class="cursor-pointer bg-bluey-500 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-500">
					<Icon name="akar-icons:discord-fill" size="23px" style="color: white" />
				</button>
			</footer>
		</sidebar>

		<div style="margin-left: max(15%, 215px);" class="p-[1%] flex flex-col w-full min-h-screen h-full">
			<nav class="z-10 sticky flex justify-between">
				<div class="">
					<span class="shadow-md bg-white px-4 py-2 flex gap-2 h-[56px] text-2xl font-bold text-left justify-start items-center rounded-full transition-colors duration-500">
						{{ currentPage }}
					</span>
				</div>
				<div class="flex justify-end gap-3">
					<span class="shadow-md bg-white px-4 py-2 flex gap-2 h-[56px] text-2xl font-bold text-left justify-start items-center rounded-full transition-colors duration-500">
						<Icon name="simple-icons:mcdonalds" size="30px" />
						{{ eventName }}
					</span>
					<button class="shadow-md bg-white cursor-pointer rounded-full w-[56px] h-[56px] flex items-center justify-center transition-colors duration-500">
						<Icon name="majesticons:logout-line" size="30px" />
					</button>
				</div>
			</nav>

			<content class="mt-[1%]">
				<slot />
			</content>
		</div>
	</div>
</template>

<script setup>
import { ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

const currentPage = ref("Home");

const route = useRoute();
const colorMode = useColorMode();
const eventName = route.params.event;

function darkMode() {
	if (colorMode.preference === "dark") colorMode.preference = "light";
	else colorMode.preference = "dark";
}

function isActive(path) {
	return route.path === path;
};

function getPath(subpath = "") {
	const basePath = `/app/${route.params.event}`;
	return subpath ? `${basePath}/${subpath}` : basePath;
};

watchEffect(() => {
	const pathParts = route.path.split("/");
	console.log(pathParts);
	const path = pathParts[3] || "home";
	currentPage.value = path.charAt(0).toUpperCase() + path.slice(1);
});
</script>