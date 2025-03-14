<template>
    <div v-if="!data.teams.length" class="text-center flex justify-center items-center min-h-[81vh]">
        <h1 class="mt-[-10px] text-3xl">No team found!<br>Let's add a new one!</h1>
        <AddTeam v-show="openAddTeam" @close="close" class="z-20" />
    </div>
    <div v-show="data.teams.length && openAddTeam" class="fixed inset-0 flex justify-center items-center z-[100]">
        <!-- Klikací overlay na zavření -->
        <div @click="openAddTeam = false" class="absolute inset-0 bg-black opacity-45"></div>

        <!-- Obsah modalu -->
        <AddTeam @close="close" class="z-20 relative" />
    </div>

    <div class="overflow-y-auto">
        <div v-if="data.teams.length" class="grid grid-cols-2 gap-4">
            <div v-for="(team, index) in data.teams" class="rounded-3xl h-60 overflow-auto max-h-60" :style="{ backgroundColor: team.color, color: 'white' }">
                <div :style="{ backgroundColor: 'white', color: 'black' }" class="h-full ml-5 font-bold text-2xl p-[1%] flex">
                    <div class="w-[50%]">
                        {{ team.name }}
                    </div>
                    <div>
                        second
                    </div>
                </div>
            </div>
        </div>
    </div>
    <button @click="openAddTeam = !openAddTeam" class="fixed bg-bluey-500 h-[80px] w-[80px] right-[30px] bottom-[30px] shadow-md cursor-pointer rounded-full flex items-center justify-center transition-colors duration-500">
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

const data = ref(await $fetch(`/api/event/${eventName}`));

useHead({
    title: eventName + " | DashHack"
});

const openAddTeam = ref(false);

async function close(added) {
    openAddTeam.value = false;
    if (added) {
        data.value = await $fetch(`/api/event/${eventName}`);
    }
}
</script>