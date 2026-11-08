<template>
	<div v-show="openLogin || openConfirm" class="fixed inset-0 flex justify-center items-center z-[100]">
		<Login v-show="openLogin" @close="openLogin = false" />
		<Confirm v-show="openConfirm" subject="Log Off" message="Are you sure, that you want to log off?" @close="closeConfirm" />
	</div>
    
	<div class="flex h-screen w-screen font-sans bg-zinc-100 text-black dark:bg-gray-900 dark:text-white transition-colors duration-500 overflow-hidden">
		
        <aside 
            class="flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-20"
            :class="[isCollapsed ? 'w-[80px]' : 'w-[240px]']"
        >
			<header class="flex flex-col justify-center items-center h-20 border-b border-gray-100 dark:border-gray-700/50">
				<NuxtLink to="/" class="flex items-center justify-center w-full h-full">
                    <img src="/logo.png" :class="isCollapsed ? 'w-8' : 'w-10'" class="transition-all duration-300">
                    <h1 v-if="!isCollapsed" class="font-bold text-lg ml-3 whitespace-nowrap">DashHack</h1>
                </NuxtLink>
			</header>

			<nav class="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
				<NuxtLink :to="getPath('teams')" class="flex items-center px-3 py-2.5 rounded-lg transition-colors group" :class="isActive(getPath('teams')) ? 'bg-bluey-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <Icon name="fluent:people-team-20-filled" size="22px" class="flex-shrink-0" />
                    <span v-if="!isCollapsed" class="ml-3 text-sm font-medium whitespace-nowrap">Teams</span>
                    <div v-if="isCollapsed" class="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Teams</div>
				</NuxtLink>

                <NuxtLink :to="getPath('kanban')" class="flex items-center px-3 py-2.5 rounded-lg transition-colors group" :class="isActive(getPath('kanban')) ? 'bg-bluey-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <Icon name="heroicons:view-columns" size="22px" class="flex-shrink-0" />
                    <span v-if="!isCollapsed" class="ml-3 text-sm font-medium whitespace-nowrap">Kanban</span>
                    <div v-if="isCollapsed" class="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Kanban</div>
                </NuxtLink>

				<NuxtLink :to="getPath('log')" class="flex items-center px-3 py-2.5 rounded-lg transition-colors group" :class="isActive(getPath('log')) ? 'bg-bluey-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <Icon name="fluent:document-bullet-list-20-filled" size="22px" class="flex-shrink-0" />
                    <span v-if="!isCollapsed" class="ml-3 text-sm font-medium whitespace-nowrap">Log</span>
                    <div v-if="isCollapsed" class="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Log</div>
				</NuxtLink>

				<NuxtLink :to="getPath('settings')" class="flex items-center px-3 py-2.5 rounded-lg transition-colors group" :class="isActive(getPath('settings')) ? 'bg-bluey-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <Icon name="fluent:settings-28-filled" size="22px" class="flex-shrink-0" />
                    <span v-if="!isCollapsed" class="ml-3 text-sm font-medium whitespace-nowrap">Settings</span>
                    <div v-if="isCollapsed" class="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Settings</div>
				</NuxtLink>
                <NuxtLink :to="getPath('mentors')" class="flex items-center px-3 py-2.5 rounded-lg transition-colors group" :class="isActive(getPath('mentors')) ? 'bg-bluey-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <Icon name="heroicons:user-group" size="22px" class="flex-shrink-0" />
                    <span v-if="!isCollapsed" class="ml-3 text-sm font-medium whitespace-nowrap">Mentors</span>
                    <div v-if="isCollapsed" class="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Mentors</div>
                </NuxtLink>
			</nav>

			<footer class="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center gap-4">
                <button @click="isCollapsed = !isCollapsed" class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                     <Icon :name="isCollapsed ? 'heroicons:chevron-double-right' : 'heroicons:chevron-double-left'" size="18px" />
                </button>

				<div class="flex items-center gap-2" :class="{ 'flex-col': isCollapsed }">
                    <button class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-bluey-500 hover:text-white transition-colors">
                        <Icon name="octicon:law-16" size="14px" />
                    </button>
                    <button @click.prevent="darkMode" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-bluey-500 hover:text-white transition-colors">
                        <ClientOnly>
                            <Icon v-if="colorMode.value === 'light'" name="i-heroicons:moon-20-solid" size="14px" />
                            <Icon v-else name="i-heroicons:sun-20-solid" size="14px" />
                        </ClientOnly>
                    </button>
                    <a :href="`${config.public.discordInvite}`" target="_blank" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-[#5865F2] hover:text-white transition-colors">
                        <Icon name="akar-icons:discord-fill" size="14px" />
                    </a>
                </div>
			</footer>
		</aside>

        <div class="flex-1 flex flex-col h-screen min-w-0">
            
            <header class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0 z-10">
				<div class="flex items-center gap-4">
					<h2 class="text-lg font-semibold text-gray-800 dark:text-white">
						{{ currentPage }}
					</h2>
                    <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
					<ClientOnly>
						<div id="tools" class="flex items-center gap-2" />
					</ClientOnly>
				</div>

				<div class="flex items-center gap-4">
                    <ClientOnly>
                        <div v-if="event?.settings?.githubToken" class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 px-2 py-1 rounded">
                            <Icon name="heroicons:server-stack" size="14px" />
                            <span v-if="rateLoading">Fetching...</span>
                            <span v-else-if="rateError" class="text-red-500">Invalid Token</span>
                            <span v-else>{{ rate }} / 5000</span>
                        </div>
                        <div v-else class="text-xs text-gray-400 italic">No Token</div>
                    </ClientOnly>

                    <button @click="!loggedIn ? openLogin = true : null" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                        <Icon :name="loggedIn ? 'i-heroicons:key-20-solid' : 'i-heroicons:lock-closed-20-solid'" size="16px" :class="loggedIn ? 'text-bluey-500' : 'text-gray-400'" />
                        <span class="text-xs font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                            {{ loggedIn ? 'Can make changes' : 'Cannot make changes' }}
                        </span>
                    </button>

                    <div class="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                        <span class="font-semibold text-gray-800 dark:text-white text-sm">{{ currentEvent }}</span>
                        <button @click="openConfirm = true" class="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                            <Icon name="majesticons:logout-line" size="20px" />
                        </button>
                    </div>
				</div>
			</header>

            <main class="flex-1 overflow-y-auto p-6 relative bg-zinc-50 dark:bg-gray-900">
				<slot />
                
                <div class="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
                    <Toast v-for="toast in toasts" :key="toast.id" v-bind="toast" class="pointer-events-auto" />
                </div>
			</main>
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
const config = useRuntimeConfig();

const isCollapsed = ref(false); 

const currentPage = computed(() => {
	const route = useRoute();
	const pathParts = route.path.split("/");
	const path = pathParts[3] || "home";
	return path.charAt(0).toUpperCase() + path.slice(1);
});
const loggedIn = computed(() => !!useCookie("sessionExists").value);

const { toasts } = useToast();
const colorMode = useColorMode();

if (event?.value?.settings?.githubToken || event?.value?.settings?.githubApp) {
	const rateData = await $fetch(`/api/github/rateLimit?event=${encodeURIComponent(currentEvent.value)}`);
	if (!rateData || rateData?.status !== 200)
		rate.value = "Error",
		rateError.value = "GitHub connection unavailable",
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
