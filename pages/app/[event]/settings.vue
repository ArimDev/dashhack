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
});

const route = useRoute();
const eventName = ref(route.params.event);

watchEffect(() => {
    useHead({
        title: eventName.value + " | DashHack"
    });
});
</script>
