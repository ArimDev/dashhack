<template>
    <div v-if="!data.teams.length" class="text-center flex justify-center items-center top-0 min-h-[81vh]">
        <AddTeam v-show="openAddTeam" @close="openAddTeam = false" class="z-10"/>
        <h1 class="mt-[-10px] text-3xl">No team found!<br>Let's add a new one!</h1>
    </div>
    <div v-if="data.teams.length" class="text-center flex justify-center items-center top-0 min-h-[81vh]">
        <h1 class="mt-[-10px] text-3xl">Teams are here!</h1>
    </div>
    <button @click="openAddTeam = !openAddTeam" class="fixed bg-bluey-500 h-[80px] w-[80px] right-[30px] bottom-[30px] shadow-md cursor-pointer rounded-full flex items-center justify-center transition-colors duration-500">
        <Icon name="material-symbols:add-2-rounded" size="50px" class="text-white" />
    </button>
    <div v-if="openAddTeam" @click="openAddTeam = !openAddTeam" class="opacity-45 fixed inset-0 z-5 bg-black"></div>
</template>

<script setup>
import { ref } from "vue";

definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const eventName = route.params.event;

const data = await $fetch(`/api/event/${eventName}`);

useHead({
    title: data.event + " | DashHack"
});

const openAddTeam = ref(false)
</script>