<script setup>
definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const eventName = route.params.event;

const data = await $fetch(`/api/event/${eventName}`);

useHead({
    title: data.event + " | DashHack"
});
</script>

<template>
    <div>
        <h1>Home</h1>
        Event name: {{ data.event }}
    </div>
</template>
