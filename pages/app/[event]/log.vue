<script setup>
definePageMeta({
    layout: 'dashboard',
    middleware: ["routes"],
});

const currentEvent = useState('currentEvent'),
    config = useRuntimeConfig();

watchEffect(() => {
    useHead({
        title: currentEvent.value + " | DashHack"
    });
});

defineOgImageComponent('NuxtSeo', {
    title: currentEvent,
    description: "Event log",
    theme: config.public.color,
    colorMode: 'dark',
});
</script>

<template>
    <div>
        <h1>Event log page</h1>
        <p>Displays events about all teams</p>
    </div>
</template>
