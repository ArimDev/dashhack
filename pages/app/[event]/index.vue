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
    description: "Main page",
    theme: config.public.color,
    colorMode: 'dark',
});
</script>

<template>
    <div>
        <h1>Home</h1>
        Event name: {{ currentEvent }}
    </div>
</template>
