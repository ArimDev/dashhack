<template>
	<div v-show="openLogin || openConfirm" class="fixed inset-0 flex justify-center items-center z-[100]">
		<Login v-show="openLogin" @close="openLogin = false" />
		<Confirm v-show="openConfirm" subject="Log Off" message="Are you sure, that you want to log off?" @close="closeConfirm" />
	</div>
	<div class="font-sans flex bg-zinc-300 text-black dark:bg-gray-900 dark:text-white transition-colors duration-500">
		<div class="fixed z-10 w-[15%] h-screen bg-white text-black dark:bg-gray-800 dark:text-white p-[2%] min-h-screen min-w-[215px] flex flex-col items-center text-center content-center align-center transition-colors duration-500">
			<header class="min-h-1/3 flex flex-col justify-center items-center">
				<NuxtLink to="/" class="min-h-1/3 flex flex-col justify-center items-center"><img src="/logo.png" width="60%"></NuxtLink>
				<h1 class="font-bold text-2xl">DashHack</h1>
			</header>
			<ul class="min-h-1/3 flex flex-col justify-center gap-9 w-full">
				<li class="text-left justify-center">
					<NuxtLink :to="getPath()" class="text-black dark:text-white cursor-pointer px-4 py-2 flex gap-2 text-2xl font-bold text-left justify-start items-center rounded-full w-full transition-colors duration-500" :class="isActive(getPath()) ? 'bg-bluey-500 text-white' : 'hover:text-bluey-500'">
						<Icon name="ph:house-fill" size="40px" />
						Home
					</NuxtLink>
				</li>
				<li class="text-left justify-center items-center">
					<NuxtLink :to="getPath('teams')" class="text-black dark:text-white cursor-pointer px-4 py-2 flex gap-2 text-2xl font-bold text-left justify-start items-center rounded-full w-full transition-colors duration-500" :class="isActive(getPath('teams')) ? 'bg-bluey-500 text-white' : 'hover:text-bluey-500'">
						<Icon name="fluent:people-team-20-filled" size="40px" />
						Teams
					</NuxtLink>
				</li>
				<li class="text-left justify-center">
					<NuxtLink :to="getPath('settings')" class="text-black dark:text-white cursor-pointer px-4 py-2 flex gap-2 text-2xl font-bold text-left justify-start items-center rounded-full w-full transition-colors duration-500" :class="isActive(getPath('settings')) ? 'bg-bluey-500 text-white' : 'hover:text-bluey-500'">
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
					<ClientOnly>
						<Icon v-if="colorMode.value === 'light'" name="i-heroicons:moon-20-solid" size="23px" style="color: white" />
						<Icon v-else name="i-heroicons:sun-20-solid" size="23px" style="color: white" />
					</ClientOnly>
				</button>
				<button class="cursor-pointer bg-bluey-500 rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-500">
					<Icon name="akar-icons:discord-fill" size="23px" style="color: white" />
				</button>
			</footer>
		</div>

		<div style="margin-left: max(15%, 215px);" class="p-[1%] flex flex-col w-full min-h-screen h-full">
			<nav class="z-10 sticky flex justify-between">
				<div class="">
					<span class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white px-4 py-2 flex gap-2 h-[56px] text-2xl font-bold text-left justify-start items-center rounded-full transition-colors duration-500">
						{{ currentPage }}
					</span>
				</div>
				<div class="flex justify-end gap-3">
					<span class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white px-4 py-2 flex gap-2 h-[56px] text-2xl font-bold text-left justify-start items-center rounded-full transition-colors duration-500">
						<Icon v-if="!!loggedIn" name="i-heroicons:key-20-solid" size="30px" />
						<button v-else @click="openLogin = true" class="cursor-pointer flex items-center transition-transform duration-300 ease-in-out transform hover:scale-115">
							<Icon name="i-heroicons:lock-closed-20-solid" size="30px" />
						</button>
						<div class="text-xs font-normal text-center">
							<div class="flex flex-row items-center justify-center gap-1">
								<p v-if="!!loggedIn">Can make changes</p>
								<p v-else>Cannot make changes</p>

								<div class="relative group">
									<Icon name="i-heroicons:question-mark-circle-16-solid" size="15px" class="cursor-pointer focus:outline-none" tabindex="0" />
									<div class="z-50 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[230px] bg-gray-800 text-white text-xs rounded-md px-2 py-1 opacity-0 invisible transition-opacity duration-300 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
										<p v-if="!!loggedIn">You logged in with password successfully.</p>
										<p v-else>To make changes on this event, you need to log in with password.</p>
									</div>
								</div>
							</div>

							<ClientOnly>
								<div class="flex flex-row items-center justify-center gap-1">
									<p v-if="!!rateLoading"><i>Fetching API...</i></p>
									<p v-else-if="!!rateError" class="text-red-500">{{ rateError }}</p>
									<p v-else-if="event?.settings?.githubToken">{{ rate }}/5000 requests</p>
									<p v-else>Token is missing</p>

									<div class="relative group flex justify-center">
										<Icon :class="rateError ? `text-red-500` : `text-black dark:text-white`" name="i-heroicons:question-mark-circle-16-solid" size="15px" class="cursor-pointer focus:outline-none transition-colors duration-500" tabindex="0" />
										<div class="z-50 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[230px] bg-gray-800 text-white text-xs rounded-md px-2 py-1 opacity-0 invisible transition-opacity duration-300 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
											<p v-if="!!rateError">Settings contains invalid token. Please update it to make new requests.</p>
											<p v-else>You have limited number of API requests per hour through the GitHub API.</p>
										</div>
									</div>
								</div>
							</ClientOnly>
						</div>
					</span>
					<span class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white px-4 py-2 flex gap-2 h-[56px] text-2xl font-bold text-left justify-start items-center rounded-full transition-colors duration-500">
						<ClientOnly>
							<img v-if="!!event.logo" :src="event.logo" :alt="`${event.event} logo`" width="30px" height="30px">
							<img v-else :src="`/logo.png`" width="30px" height="30px" />
						</ClientOnly>
						{{ currentEvent }}
					</span>
					<button @click="openConfirm = true" class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white cursor-pointer rounded-full w-[56px] h-[56px] flex items-center justify-center transition-colors duration-500">
						<Icon name="majesticons:logout-line" size="30px" />
					</button>
				</div>
			</nav>

			<div class="mt-[1%]">
				<slot v-if="event" />
			</div>
			<div class="z-200 toast-container fixed bottom-0 right-0 mr-7 mb-7 flex flex-col-reverse gap-4">
				<Toast v-for="toast in toasts" :key="toast.id" v-bind="toast" class="relative" />
			</div>
		</div>
	</div>
</template>

<script setup>
const currentEvent = useState('currentEvent');
const event = useState('eventData');
const rate = ref("?");
const rateLoading = ref(true);
const rateError = ref(false);
const openLogin = ref(false);
const openConfirm = ref(false);

const currentPage = computed(() => {
	const route = useRoute();
	const pathParts = route.path.split("/");
	const path = pathParts[3] || "home";
	return path.charAt(0).toUpperCase() + path.slice(1);
});
const loggedIn = computed(() => !!useCookie("sessionExists").value);

const { toasts } = useToast();
const colorMode = useColorMode();

if (event?.settings?.githubToken) {
	const rateData = await $fetch(`/api/github/rateLimit?event=${encodeURIComponent(currentEvent.value)}`);
	if (!rateData || rateData?.status !== 200)
		rate.value = "Error",
			rateError.value = "Invalid GitHub token",
			rateLoading.value = false;
	else rate.value = rateData.rate.remaining,
		rateLoading.value = false;;
} else rateLoading.value = false;

function darkMode() {
	if (colorMode.value === "dark") colorMode.preference = "light";
	else colorMode.preference = "dark";
}

function isActive(path) {
	const route = useRoute();
	return route.path === path;
};

function getPath(subpath = "") {
	const basePath = `/app/${currentEvent.value}`;
	return subpath ? `${basePath}/${subpath}` : basePath;
};

async function closeConfirm(success) {
	if (!!success) {
		return await navigateTo({ path: `/` });
	} else openConfirm.value = false;
}
</script>