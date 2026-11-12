<template>
    <Login v-if="openLogin" @close="openLogin = false" />
    <Confirm v-if="openConfirm" subject="Log Off" message="Are you sure you want to log off?" @close="closeConfirm" />
    <DialogShell v-if="mobileMenu" title="Event navigation" @close="mobileMenu = false">
        <p class="mb-4 break-words text-sm text-gray-500 dark:text-gray-400">{{ currentEvent }}</p>
        <nav aria-label="Event navigation" class="grid gap-2">
            <NuxtLink v-for="item in navigation" :key="item.path" :to="getPath(item.path)" @click="mobileMenu = false"
                :aria-current="isActive(getPath(item.path)) ? 'page' : undefined"
                class="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
                :class="isActive(getPath(item.path)) ? 'bg-bluey-500 text-white' : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-100'">
                <Icon :name="item.icon" size="22px" />{{ item.label }}
            </NuxtLink>
        </nav>
        <div class="mt-5 grid gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
            <button class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm" @click="darkMode"><Icon name="heroicons:moon" size="20px" />{{ colorMode.value === 'dark' ? 'Light mode' : 'Dark mode' }}</button>
            <button v-if="!loggedIn" class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm" @click="mobileAction('login')"><Icon name="heroicons:lock-closed" size="20px" />Log in to edit</button>
            <button class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm" @click="mobileAction('logout')"><Icon name="heroicons:arrow-left-on-rectangle" size="20px" />Leave event</button>
            <NuxtLink to="/" class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm">DashHack home</NuxtLink>
            <a v-if="config.public.discordInvite" :href="config.public.discordInvite" target="_blank" rel="noopener noreferrer" class="flex min-h-11 items-center px-3 text-sm">Event Discord</a>
        </div>
    </DialogShell>

    <div class="dashboard-shell flex w-full overflow-hidden bg-zinc-50 font-sans text-gray-900 dark:bg-gray-900 dark:text-white">
        <aside class="hidden shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:flex" :class="isCollapsed ? 'w-20' : 'w-60'">
            <header class="flex h-20 shrink-0 items-center justify-center border-b border-gray-100 dark:border-gray-700">
                <NuxtLink to="/" aria-label="DashHack home" class="flex min-h-11 items-center gap-3 px-3"><img src="/logo.png" alt="" class="w-9" /><span v-if="!isCollapsed" class="text-lg font-bold">DashHack</span></NuxtLink>
            </header>
            <nav aria-label="Event pages" class="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-5">
                <NuxtLink v-for="item in navigation" :key="item.path" :to="getPath(item.path)" :title="isCollapsed ? item.label : undefined"
                    :aria-current="isActive(getPath(item.path)) ? 'page' : undefined"
                    class="flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                    :class="isActive(getPath(item.path)) ? 'bg-bluey-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'">
                    <Icon :name="item.icon" size="22px" class="shrink-0" /><span :class="isCollapsed ? 'sr-only' : 'ml-3'">{{ item.label }}</span>
                </NuxtLink>
            </nav>
            <footer class="flex flex-col items-center gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
                <button class="icon-button text-gray-500" :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="isCollapsed = !isCollapsed"><Icon :name="isCollapsed ? 'heroicons:chevron-double-right' : 'heroicons:chevron-double-left'" size="20px" /></button>
                <div class="flex flex-wrap justify-center gap-2">
                    <button @click="darkMode" class="icon-button text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"><Icon :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'" size="20px" /></button>
                    <a v-if="config.public.discordInvite" :href="config.public.discordInvite" target="_blank" rel="noopener noreferrer" aria-label="Event Discord" class="icon-button text-gray-500"><Icon name="akar-icons:discord-fill" size="20px" /></a>
                </div>
            </footer>
        </aside>
        <div class="flex min-w-0 flex-1 flex-col">
            <a href="#dashboard-content" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-bluey-500 focus:p-3 focus:text-white">Skip to content</a>
            <header class="dashboard-header z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <button type="button" aria-label="Open navigation" :aria-expanded="mobileMenu" class="icon-button shrink-0 text-gray-600 dark:text-gray-300 lg:hidden" @click="mobileMenu = true"><Icon name="heroicons:bars-3" size="24px" /></button>
                    <div class="min-w-0">
                        <h2 class="truncate text-base font-bold sm:text-lg">{{ currentPage }}</h2>
                        <p class="truncate text-xs text-gray-500 dark:text-gray-400 lg:hidden" :title="currentEvent">{{ currentEvent }}</p>
                    </div>
                </div>
                <div class="flex shrink-0 items-center gap-2 sm:gap-4">
                    <ClientOnly>
                        <div v-if="event?.settings?.githubToken || event?.settings?.githubApp" class="hidden items-center gap-2 text-xs text-gray-500 xl:flex">
                            <Icon name="heroicons:server-stack" size="14px" />
                            <span v-if="rateLoading">Fetching…</span><span v-else-if="rateError">GitHub unavailable</span><span v-else>{{ rate }} / 5000</span>
                        </div>
                    </ClientOnly>
                    <button @click="!loggedIn ? openLogin = true : null" class="flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                        <Icon :name="loggedIn ? 'heroicons:key' : 'heroicons:lock-closed'" size="18px" class="shrink-0" :class="loggedIn ? 'text-bluey-500' : ''" />
                        <span class="text-xs font-semibold lg:hidden">{{ loggedIn ? 'Editing' : 'Log in' }}</span>
                        <span class="hidden text-xs font-medium lg:inline">{{ loggedIn ? 'Can make changes' : 'Cannot make changes' }}</span>
                    </button>
                    <div class="hidden min-w-0 items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-700 lg:flex">
                        <span class="max-w-48 truncate text-sm font-semibold" :title="currentEvent">{{ currentEvent }}</span>
                        <button @click="openConfirm = true" class="icon-button text-gray-500 hover:text-red-500" title="Logout" aria-label="Logout"><Icon name="heroicons:arrow-left-on-rectangle" size="21px" /></button>
                    </div>
                </div>
                <ClientOnly><div id="tools" class="flex max-w-full flex-wrap items-center gap-2 empty:hidden" /></ClientOnly>
            </header>
            <main id="dashboard-content" tabindex="-1" class="dashboard-content relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
                <slot />
            </main>
        </div>
        <nav aria-label="Quick navigation" class="mobile-bottom-nav lg:hidden">
            <NuxtLink v-for="item in navigation.slice(0,4)" :key="item.path" :to="getPath(item.path)" :aria-current="isActive(getPath(item.path)) ? 'page' : undefined"
                class="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold"
                :class="isActive(getPath(item.path)) ? 'bg-bluey-50 text-bluey-600 dark:bg-bluey-950 dark:text-bluey-300' : 'text-gray-500 dark:text-gray-400'">
                <Icon :name="item.icon" size="22px" /><span>{{ item.label }}</span>
            </NuxtLink>
            <button class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-gray-500 dark:text-gray-400" aria-label="More event pages" :aria-expanded="mobileMenu" @click="mobileMenu = true"><Icon name="heroicons:ellipsis-horizontal" size="22px" /><span>More</span></button>
        </nav>
        <div class="toast-stack fixed z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
            <Toast v-for="toast in toasts" :key="toast.id" v-bind="toast" class="pointer-events-auto" />
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
const mobileMenu = ref(false);
const route = useRoute();
const navigation = [
    { path: 'teams', label: 'Teams', icon: 'heroicons:user-group' },
    { path: 'kanban', label: 'Kanban', icon: 'heroicons:view-columns' },
    { path: 'matice', label: 'Matice', icon: 'heroicons:table-cells' },
    { path: 'social-wall', label: 'Social Wall', icon: 'heroicons:photo' },
    { path: 'mentors', label: 'Mentors', icon: 'heroicons:academic-cap' },
    { path: 'log', label: 'Log', icon: 'heroicons:document-text' },
    { path: 'settings', label: 'Settings', icon: 'heroicons:cog-6-tooth' },
];
watch(() => route.fullPath, () => { mobileMenu.value = false; });
function mobileAction(action) {
    mobileMenu.value = false;
    nextTick(() => { if (action === 'login') openLogin.value = true; else openConfirm.value = true; });
}

const currentPage = computed(() => {
	const route = useRoute();
	const pathParts = route.path.split("/");
	const path = pathParts[3] || "home";
	return path.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
});
const eventCanEdit = useState('eventCanEdit', () => false);
const sessionExists = useCookie('sessionExists');
const loggedIn = computed(() => !!eventCanEdit.value && !!sessionExists.value);

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
	const basePath = `/app/${encodeURIComponent(currentEvent.value)}`;
	return subpath ? `${basePath}/${subpath}` : basePath;
};

async function closeConfirm(success) {
	if (!!success) {
		return await navigateTo({ path: `/` });
	} else openConfirm.value = false;
}
</script>
