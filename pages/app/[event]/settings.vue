<script setup>
definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const eventName = route.params.event;

const data = await $fetch(`/api/event/${eventName}`);

useHead({
    title: eventName + " | DashHack"
});
</script>

<template>
    <div>
        <h1>Settings</h1>
        Event name: {{ data.event }}
    </div>
</template>
