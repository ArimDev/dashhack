<template>
    <Login v-if="openLogin" @close="openLogin = false" />
    <Confirm v-if="openConfirm" subject="Log Off" message="Are you sure you want to log off?" @close="closeConfirm" />
    <DialogShell v-if="mobileMenu" title="Menu" @close="mobileMenu = false">
        <DashboardIdentity class="mb-3" :event-name="currentEvent" :logged-in="loggedIn" :dark="colorMode.value === 'dark'" :discord-invite="config.public.discordInvite" :show-quota="hasGithub" :quota="quota" @login="mobileAction('login')" @leave="mobileAction('logout')" @theme="darkMode" />
        <nav aria-label="Event navigation" class="grid grid-cols-2 gap-2">
            <NuxtLink v-for="item in navigation" :key="item.path" :to="getPath(item.path)" @click="mobileMenu = false"
                :aria-current="isActive(getPath(item.path)) ? 'page' : undefined"
                class="flex min-h-12 items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold"
                :class="isActive(getPath(item.path)) ? 'border-bluey-500 bg-bluey-50 text-bluey-700 dark:bg-bluey-950 dark:text-bluey-200' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700'">
                <Icon :name="item.icon" size="22px" class="shrink-0" /><span>{{ item.label }}</span>
            </NuxtLink>
        </nav>
    </DialogShell>

    <div :class="{ 'mentor-dashboard': route.path.endsWith('/teams') }" class="dashboard-shell flex w-full overflow-hidden bg-zinc-50 font-sans text-gray-900 dark:bg-gray-900 dark:text-white">
        <aside class="dashboard-sidebar relative hidden shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:flex" :class="isCollapsed ? 'w-18' : 'w-52'">
            <DashboardIdentity class="shrink-0 border-b border-gray-200 dark:border-gray-700" :collapsed="isCollapsed" :event-name="currentEvent" :logged-in="loggedIn" :dark="colorMode.value === 'dark'" :discord-invite="config.public.discordInvite" :show-quota="hasGithub" :quota="quota" @login="openLogin = true" @leave="openConfirm = true" @theme="darkMode" />
            <nav aria-label="Event pages" class="min-h-0 flex flex-1 flex-col gap-1 overflow-y-auto py-2" :class="isCollapsed ? 'px-1' : 'px-2'">
                <NuxtLink v-for="item in navigation" :key="item.path" :to="getPath(item.path)" :title="isCollapsed ? item.label : undefined"
                    :aria-current="isActive(getPath(item.path)) ? 'page' : undefined"
                    class="flex min-h-11 shrink-0 items-center rounded-xl py-2.5 text-sm font-medium transition-colors"
                    :class="[isCollapsed ? 'justify-center px-0' : 'px-3', isActive(getPath(item.path)) ? 'bg-bluey-50 text-bluey-700 font-semibold dark:bg-bluey-950 dark:text-bluey-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700']">
                    <Icon :name="item.icon" size="22px" class="shrink-0" /><span :class="isCollapsed ? 'sr-only' : 'ml-3'">{{ item.label }}</span>
                </NuxtLink>
            </nav>
        </aside>
        <div class="flex min-w-0 flex-1 flex-col">
            <a href="#dashboard-content" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-bluey-500 focus:p-3 focus:text-white">Skip to content</a>
            <header class="dashboard-header z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div class="dashboard-heading flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <button type="button" aria-label="Open navigation" :aria-expanded="mobileMenu" class="icon-button shrink-0 text-gray-600 dark:text-gray-300 lg:hidden" @click="mobileMenu = true"><Icon name="heroicons:bars-3" size="24px" /></button>
                    <div class="min-w-0">
                        <h2 class="truncate text-base font-bold sm:text-lg">{{ currentPage }}</h2>
                    </div>
                </div>
                <ClientOnly><div id="tools" class="flex w-full min-w-0 basis-full max-w-full flex-wrap items-center gap-2 empty:hidden" /></ClientOnly>
            </header>
            <main id="dashboard-content" tabindex="-1" class="dashboard-content relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                <slot />
            </main>
        </div>
        <nav aria-label="Quick navigation" class="mobile-bottom-nav lg:hidden">
            <NuxtLink v-for="item in navigation.slice(0,4)" :key="item.path" :to="getPath(item.path)" :aria-current="isActive(getPath(item.path)) ? 'page' : undefined"
                class="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold"
                :class="isActive(getPath(item.path)) ? 'bg-bluey-50 text-bluey-600 dark:bg-bluey-950 dark:text-bluey-300' : 'text-gray-500 dark:text-gray-400'">
                <Icon :name="item.icon" size="22px" /><span>{{ item.shortLabel || item.label }}</span>
            </NuxtLink>
            <button class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold" :class="secondaryPage ? 'bg-bluey-50 text-bluey-700 dark:bg-bluey-950 dark:text-bluey-300' : 'text-gray-600 dark:text-gray-300'" aria-label="More event pages" :aria-expanded="mobileMenu" @click="mobileMenu = true"><Icon :name="secondaryPage?.icon || 'heroicons:ellipsis-horizontal'" size="22px" /><span>{{ secondaryPage?.shortLabel || secondaryPage?.label || 'More' }}</span></button>
        </nav>
        <div class="toast-stack fixed z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
            <Toast v-for="toast in toasts" :key="toast.id" v-bind="toast" class="pointer-events-auto" />
        </div>
    </div>
</template>

<script setup>
const currentEvent = useState('currentEvent');
const event = useState('eventData');
const rate = ref("?"), rateLimit = ref(5000);
const rateLoading = ref(true);
const rateError = ref(false);
const openLogin = ref(false);
const openConfirm = ref(false);
const config = useRuntimeConfig();
const hasGithub = computed(() => !!(event.value?.settings?.githubToken || event.value?.settings?.githubApp));
const quota = computed(() => ({remaining:rate.value, limit:rateLimit.value, loading:rateLoading.value, error:rateError.value}));

const isCollapsed = ref(false);
let sidebarViewport;
function syncSidebarViewport() { isCollapsed.value = !sidebarViewport.matches; }
const mobileMenu = ref(false);
const route = useRoute();
const navigation = [
    { path: 'teams', label: 'Teams', icon: 'heroicons:user-group' },
    { path: 'kanban', label: 'Kanban', icon: 'heroicons:view-columns' },
    { path: 'matice', label: 'Matice', icon: 'heroicons:table-cells' },
    { path: 'github-metrics', label: 'GitHub metrics', shortLabel: 'Metrics', icon: 'heroicons:chart-bar' },
    { path: 'social-wall', label: 'Social Wall', icon: 'heroicons:photo' },
    { path: 'mentors', label: 'Mentors', icon: 'heroicons:academic-cap' },
    { path: 'history', label: 'History', icon: 'heroicons:clipboard-document-list' },
    { path: 'settings', label: 'Settings', icon: 'heroicons:cog-6-tooth' },
];
const secondaryPage = computed(() => navigation.slice(4).find(item => isActive(getPath(item.path))));
onMounted(() => {
    sidebarViewport = window.matchMedia('(min-width: 1280px)');
    syncSidebarViewport();
    sidebarViewport.addEventListener('change', syncSidebarViewport);
});
onBeforeUnmount(() => sidebarViewport?.removeEventListener('change', syncSidebarViewport));
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
        rateLimit.value = rateData.rate.limit || 5000,
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
