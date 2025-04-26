<script setup>
definePageMeta({
    layout: 'dashboard',
	middleware: ["routes"],
});

const currentEvent = useState('currentEvent');
watchEffect(() => {
    useHead({
        title: currentEvent.value + " | DashHack"
    });
});

const event = (await $fetch(`/api/event/${currentEvent.value}`)).data;
</script>

<template>
    <div>
        <h1>Home</h1>
        Event name: {{ event.event }}
    </div>
</template>
