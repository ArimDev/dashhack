<template>
    <ClientOnly>
        <Teleport to="#tools">
            <button @click="compact = !compact" :class="compact ? `text-bluey-500` : `text-black dark:text-white`" class="group shadow-md bg-white dark:bg-gray-800 cursor-pointer rounded-full w-[56px] h-[56px] flex items-center justify-center transition-colors duration-500 relative">
                <Icon name="heroicons:squares-2x2-16-solid" size="30px" />
                <div class="z-50 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[230px] bg-gray-800 text-white text-xs rounded-md px-2 py-1 opacity-0 invisible transition-opacity duration-300 group-hover:opacity-100 group-hover:visible">
                    <p>Use compact overview.</p>
                </div>
            </button>
            <button @click="notes = !notes" :class="notes ? `text-bluey-500` : `text-black dark:text-white`" class="group shadow-md bg-white dark:bg-gray-800 cursor-pointer rounded-full w-[56px] h-[56px] flex items-center justify-center transition-colors duration-500 relative">
                <Icon name="heroicons:bars-3-bottom-left-16-solid" size="30px" />
                <div class="z-50 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[230px] bg-gray-800 text-white text-xs rounded-md px-2 py-1 opacity-0 invisible transition-opacity duration-300 group-hover:opacity-100 group-hover:visible">
                    <p>Show team notes.</p>
                </div>
            </button>
        </Teleport>
        <div v-if="!data.teams.length" class="text-center flex justify-center items-center min-h-[81vh]">
            <h1 class="mt-[-10px] text-3xl">No team found!<br>Let's add a new one!</h1>
        </div>
        <div v-show="(openAddTeam || openConfirm)" class="fixed inset-0 flex justify-center items-center z-[100]">
            <AddTeam v-show="openAddTeam" :team="selectedTeam || false" @close="close" />
            <Confirm v-show="openConfirm" subject="Delete Team" message="Are you sure, that you want to delete team $var?" :team="selectedTeam" @close="close" />
        </div>

        <div v-if="!!data.teams.length" :class="compact ? `grid-cols-4 grid-rows-4` : `grid-cols-1 xl:grid-cols-2`" class="grid gap-4">
            <!-- https://github.com/nuxt/icon/issues/376 -->
            <Icon style="display: none;" name="heroicons:magnifying-glass-plus-16-solid" />
            <Icon style="display: none;" name="heroicons:magnifying-glass-minus-16-solid" />
            <Icon style="display: none;" name="heroicons:arrows-pointing-out-16-solid" />
            <Icon style="display: none;" name="heroicons:hand-raised-16-solid" />
            <Icon style="display: none;" name="heroicons:arrow-path-16-solid" />
            <!-- https://github.com/nuxt/icon/issues/376 -->
            <Team v-for="(team, index) in data.teams" :key="index" :team="team" :notes="notes" :compact="compact" @edit="open" @delete="confirm" />
        </div>

        <button @click="open(false)" class="fixed bg-bluey-500 h-[80px] w-[80px] right-[30px] bottom-[30px] shadow-md cursor-pointer rounded-full flex items-center justify-center transition-colors duration-500">
            <Icon name="material-symbols:add-2-rounded" size="50px" class="text-white" />
        </button>
    </ClientOnly>
</template>

<script setup>
definePageMeta({
    layout: 'dashboard',
    middleware: ["routes"],
});

const currentEvent = useState('currentEvent'),
    data = useState('eventData'),
    config = useRuntimeConfig();

watchEffect(() => {
    useHead({
        title: currentEvent.value + " | DashHack"
    });
});

defineOgImageComponent('NuxtSeo', {
    title: currentEvent,
    description: "Teams",
    theme: config.public.color,
    colorMode: 'dark',
});

const openAddTeam = ref(false),
    openConfirm = ref(false),
    selectedTeam = ref(false),
    notes = ref(false),
    compact = ref(false);

if (import.meta.client) {
    notes.value = localStorage.getItem('teamNotes') === 'true';
    watch(notes, (newValue) => localStorage.setItem('teamNotes', newValue));
    compact.value = localStorage.getItem('teamsCompact') === 'true';
    watch(compact, (newValue) => localStorage.setItem('teamsCompact', newValue));
}

async function open(team) {
    if (team) selectedTeam.value = team;
    else selectedTeam.value = false;
    openAddTeam.value = true;
};

async function confirm(team) {
    selectedTeam.value = team;
    openConfirm.value = true;
};

async function close(added) {
    openAddTeam.value = false;
    openConfirm.value = false;
    selectedTeam.value = false;
    if (added) data.value = (await $fetch(`/api/event/${currentEvent.value}`)).data;
};
</script>