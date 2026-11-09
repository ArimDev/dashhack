<template>
    <div class="settings-grid grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 items-start gap-4">
        <EventName />
        <Password />
        <EventLogo />
        <Token />
        <GitHubConnection />
        <XCollector v-if="canEdit" />
        <InstagramCollector v-if="canEdit" />
        <Backup />
    </div>
</template>

<script setup>
definePageMeta({
    layout: 'dashboard',
    middleware: ["routes"],
});

const canEdit = useState('eventCanEdit');
const currentEvent = useState('currentEvent'),
    config = useRuntimeConfig();

watchEffect(() => {
    useHead({
        title: currentEvent.value + " | DashHack"
    });
});

</script>
