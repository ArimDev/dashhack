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
</script>

<template>
    <div>
        <h1>Home</h1>
        Event name: {{ currentEvent }}
    </div>
</template>
