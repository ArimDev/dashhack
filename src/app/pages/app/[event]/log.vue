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

</script>

<template>
    <div>
        <h1>Event log page</h1>
        <p>Displays events about all teams</p>
    </div>
</template>
