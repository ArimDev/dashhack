<template>
    <div class="flex flex-wrap gap-8">
        <EventName />
        <Password />
        <EventLogo />
        <Token />
    </div>
</template>

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
    description: "Settings page",
    theme: config.public.color,
    colorMode: 'dark',
});
</script>
