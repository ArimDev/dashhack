<template>
    <div class="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <EventName />
        <Password />
        <EventLogo />
        <Token />
        <GitHubConnection />
        <XCollector v-if="canEdit" />
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
