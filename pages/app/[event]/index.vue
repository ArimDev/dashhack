<script setup>
definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const eventName = ref(route.params.event);

const event = (await $fetch(`/api/event/${eventName.value}`)).data;

useHead({
    title: eventName + " | DashHack"
});
</script>

<template>
    <div>
        <h1>Home</h1>
        Event name: {{ event.event }}
    </div>
</template>
