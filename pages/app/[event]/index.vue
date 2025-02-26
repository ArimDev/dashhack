<script setup>
definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const eventName = route.params.event;

const data = await $fetch(`/api/event/${eventName}`);

useHead({
    title: "DashHack | " + data.event
});
</script>

<template>
    <div>
        Event name: {{ data.event }}
    </div>
</template>
