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

const currentEvent = useState('currentEvent');
watchEffect(() => {
    useHead({
        title: currentEvent.value + " | DashHack"
    });
});
</script>
