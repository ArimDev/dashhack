<template>
	<div class="font-sans flex min-h-dvh bg-white dark:bg-gray-900 flex-col transition-colors duration-500">

		<div class="mx-auto my-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
			<div class="p-1 sm:p-6">
				<h1 class="font-extrabold text-bluey-500 text-[clamp(3rem,12vw,8rem)] leading-tight tracking-tight text-center">DashHack</h1>
				<h2 class="font-bold text-black text-xl sm:text-4xl text-center dark:text-white transition-colors duration-500">Hackathon Monitoring</h2>
			</div>
			<form @submit="open" class="mx-auto flex w-full max-w-2xl flex-col items-center pt-8 sm:pt-10">
				<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
					<input data-testid="username-input" @input="checkEventFree" v-model="credentials.user" required type="text" autocomplete="username" aria-label="Event name" placeholder="Event Name" class="text-xl rounded-lg bg-zinc-300 w-full min-w-0 h-14 sm:h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4" />
					<input aria-label="Event password" data-testid="password-input" @focus="clearSubmit" v-model="credentials.pass" type="password" autocomplete="current-password" placeholder="Password" class="text-xl rounded-lg bg-zinc-300 w-full min-w-0 h-14 sm:h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4">
				</div>
                <p class="mt-4 text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ eventTaken ? 'Leave the password empty to view this event, or sign in to edit.' : 'Enter an event name and password to create your dashboard.' }}</p>
				<button data-testid="login-button" type="submit" :class="`cursor-pointer text-xl font-bold mt-6 rounded-2xl w-full sm:w-72 min-w-0 h-14 sm:h-16 transition-colors duration-500 ${submitClass}`">{{ submitText }}</button>
			</form>
		</div>

		<footer class="px-4 pb-6 pt-4 sm:pb-10 text-black text-center font-mono">
			<div class="flex gap-5 justify-center">
				<ClientOnly>
					<button type="button" @click.prevent="darkMode" class="cursor-pointer text-bluey-500 hover:text-bluey-600 dark:hover:text-bluey-400 dark:text-bluey-300 transition-colors duration-500">
						{{ colorMode.value === "dark" ? "Light" : "Dark" }} Mode
					</button>

					<template #fallback>
						<span class="text-black dark:text-white font-normal font-mono italic">Loading color mode…</span>
					</template>
				</ClientOnly>
			</div>

			<div>
				<p class="dark:text-white transition-colors duration-500">&copy; 2025 <a href="https://github.com/ArimDev/" class="hover:text-bluey-500">ArimDev</a></p>
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
	if (colorMode.value === "dark") colorMode.preference = "light";
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
		const data = await $fetch(`/api/auth/available?username=${encodeURIComponent(credentials.value.user)}`);

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

async function open(event) {
	event.preventDefault();

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

			// TODO: Check create status AUTH API

			eventTaken.value = true;
			eventFree.value = false;
			submitText.value = "Open Dashboard";

			data = await $fetch(`/api/auth/login`, {
				method: "POST",
				body: { username: credentials.value.user, password: credentials.value.pass }
			});

			if (!data || data.status !== 200) {
				console.warn("Failed to log in:", data);
			} else {
				return await navigateTo(`/app/${encodeURIComponent(credentials.value.user)}`);
			}
		}
	} else if (eventTaken.value) {
		if (!credentials.value.pass) {
			return await navigateTo(`/app/${encodeURIComponent(credentials.value.user)}`);
		} else {
			const data = await $fetch(`/api/auth/login`, {
				method: "POST",
				body: { username: credentials.value.user, password: credentials.value.pass }
			});

			if (!data || data?.status !== 200) {
				console.warn("Failed to log in:", data || "No data");
				if (data?.status === 401) {
					submitText.value = "Wrong password!";
					return submitRed.value = true;
				}
			} else {
				return await navigateTo(`/app/${encodeURIComponent(credentials.value.user)}`);
			}
		}
	} else {
		submitText.value = "Enter the Event Name!";
		return submitRed.value = true;
	}
}
</script>