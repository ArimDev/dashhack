<template>
	<div class="font-sans flex min-h-screen bg-white dark:bg-gray-900 flex-col transition-colors duration-500">

		<div class="m-auto">
			<div class="p-6">
				<h1 class="font-extrabold text-bluey-500 text-9xl text-center">DashHack</h1>
				<h2 class="font-bold text-black text-6xl text-center dark:text-white transition-colors duration-500">Hackathon Monitoring</h2>
			</div>
			<form class="pt-10 flex items-center flex-col">
				<div class="flex gap-10">
					<input @input="checkEventFree" v-model="credentials.user" required type="username" placeholder="Event Name" class="text-xl rounded-lg bg-zinc-300 w-72 h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4" />
					<input @focus="clearSubmit" v-model="credentials.pass" type="password" autocomplete="current-password" placeholder="Password" class="text-xl rounded-lg bg-zinc-300 w-72 h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4">
				</div>
				<button @click="open" type="submit" :class="`cursor-pointer text-xl font-bold mt-10 rounded-full w-72 h-16 transition-colors duration-500 ${submitClass}`">{{ submitText }}</button>
			</form>
		</div>

		<footer class="pb-16 text-black text-center font-mono">
			<div class="flex gap-5 justify-center">
				<span @click.prevent="darkMode" class="cursor-pointer text-bluey-500 hover:text-bluey-600 dark:hover:text-bluey-400 dark:text-bluey-300 transition-colors duration-500">
					{{ colorMode.preference === "dark" ? "Light" : "Dark" }} Mode
				</span>
			</div>
			<div class="flex gap-5 justify-center underline">
				<a href="" class="hover:text-bluey-500 dark:hover:text-bluey-500 dark:text-white transition-colors duration-500">Privacy Policy</a>
				<a href="" class="hover:text-bluey-500 dark:hover:text-bluey-500 dark:text-white transition-colors duration-500">Terms of Use</a>
			</div>
			<div>
				<p class="dark:text-white transition-colors duration-500">&copy; 2025 <a href="" class="hover:text-bluey-500 dark:hover:text-bluey-500 dark:text-white transition-colors duration-500">ArimDev</a></p>
			</div>
		</footer>
	</div>
</template>

<script setup>
definePageMeta({
	layout: 'landing',
});

useHead({
	title: 'DashHack | Hackathon Monitoring',
	meta: [
		{ name: 'description', content: 'Hackathon Monitoring' }
	],
});

import { ref } from "vue";

const credentials = ref({ user: "", pass: "" });

const eventTaken = ref(false);
const eventFree = ref(false);

const submitRed = ref(false);
const submitText = ref("Create New Event");

const submitClass = computed(() =>
	!submitRed.value
		? "bg-bluey-500 text-white hover:bg-bluey-600"
		: "bg-red-700 text-white hover:bg-red-800"
);

const colorMode = useColorMode();

function darkMode() {
	if (colorMode.preference === "dark") colorMode.preference = "light";
	else colorMode.preference = "dark";
}

function clearSubmit() {
	if (eventFree.value) {
		submitRed.value = false;
		submitText.value = "Create New Event";
		return;
	}
}

async function checkEventFree() {
	submitText.value = "Create New Event";
	submitRed.value = false;

	if (!!credentials.value.user) {
		const data = await $fetch(`/api/auth/check?username=${credentials.value.user}`);

		if (data.exists) {
			eventTaken.value = true;
			eventFree.value = false;
			submitText.value = "Open Dashboard";
			return;
		}
	}

	eventTaken.value = false;
	eventFree.value = true;
	submitText.value = "Create New Event";
	return;
}

async function open() {
	event.preventDefault();

	console.log(credentials.value.user + " " + credentials.value.pass);

	if (eventFree.value) {
		if (!credentials.value.user) {
			submitText.value = "Enter the Event Name!";
			return submitRed.value = true;
		} else if (!credentials.value.pass) {
			submitText.value = "Enter a new Password!";
			return submitRed.value = true;
		} else {
			let data = await $fetch(`/api/auth/create`, {
				method: "POST",
				body: { username: credentials.value.user, password: credentials.value.pass }
			});

			//AUTH API TODO: Check create status

			eventTaken.value = true;
			eventFree.value = false;
			submitText.value = "Open Dashboard";

			data = await $fetch(`/api/auth/login`, {
				method: "POST",
				body: { username: credentials.value.user, password: credentials.value.pass }
			});

			if (!data || !data.success) {
				console.log(data);

				//AUTH API TODO: What's the error?
			} else {
				await navigateTo(`/app/${credentials.value.user}`);
			}
		}
	} else if (eventTaken.value) {
		if (!credentials.value.pass) {
			await navigateTo(`/app/${credentials.value.user}`);
		} else {
			const data = await $fetch(`/api/auth/login`, {
				method: "POST",
				body: { username: credentials.value.user, password: credentials.value.pass }
			});

			if (!data || !data.success) {
				console.log(data);

				//AUTH API TODO: What's the error?
			} else {
				await navigateTo(`/app/${credentials.value.user}`);
			}
		}
	} else {
		submitText.value = "Enter the Event Name!";
		return submitRed.value = true;
	}
}
</script>