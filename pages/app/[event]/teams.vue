<template>
    <div v-if="!data.teams.length" class="text-center flex justify-center items-center min-h-[81vh]">
        <h1 class="mt-[-10px] text-3xl">No team found!<br>Let's add a new one!</h1>
        <AddTeam v-show="openAddTeam" @close="close" class="z-20" />
    </div>
    <div v-show="data.teams.length && (openAddTeam || openConfirm)" class="fixed inset-0 flex justify-center items-center z-[100]">
        <AddTeam v-show="openAddTeam" :team="selectedTeam || false" @close="close" />
        <Confirm v-show="openConfirm" subject="Delete Team" message="Are you sure, that you want to delete team $var?" :team="selectedTeam" @close="close" />
    </div>

    <div v-if="!!data.teams.length" class="grid grid-cols-2 gap-4">
        <Icon style="display: none;" name="heroicons:magnifying-glass-plus-16-solid" />
        <Icon style="display: none;" name="heroicons:magnifying-glass-minus-16-solid" />
        <Icon style="display: none;" name="heroicons:arrows-pointing-out-16-solid" />
        <Icon style="display: none;" name="heroicons:hand-raised-16-solid" />
        <Icon style="display: none;" name="heroicons:arrow-path-16-solid" />
        <Team v-for="(team, index) in data.teams" :key="index" :team="team" @edit="open" @delete="confirm" />
    </div>

    <button @click="open(false)" class="fixed bg-bluey-500 h-[80px] w-[80px] right-[30px] bottom-[30px] shadow-md cursor-pointer rounded-full flex items-center justify-center transition-colors duration-500">
        <Icon name="material-symbols:add-2-rounded" size="50px" class="text-white" />
    </button>
</template>

<script setup>
import { ref } from "vue";

definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const eventName = route.params.event;

useHead({
    title: eventName + " | DashHack"
});

const data = ref((await $fetch(`/api/event/${eventName}`)).data);

const openAddTeam = ref(false);
const openConfirm = ref(false);
const selectedTeam = ref(false);

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
    if (added) data.value = (await $fetch(`/api/event/${eventName}`)).data;
};
</script>