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
    <section class="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 dark:border-gray-700 dark:bg-gray-800">
        <Icon name="heroicons:document-text" size="32px" class="mb-4 text-bluey-500" />
        <h1 class="text-xl font-bold">Event log</h1>
        <p class="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">The activity log is not available yet. You can find team observations and help requests in Teams and Kanban.</p>
        <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink :to="`/app/${encodeURIComponent(currentEvent)}/teams`" class="inline-flex min-h-11 items-center rounded-xl bg-bluey-500 px-4 py-2 text-sm font-semibold text-white">Open Teams</NuxtLink>
            <NuxtLink :to="`/app/${encodeURIComponent(currentEvent)}/kanban`" class="inline-flex min-h-11 items-center rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">Open Kanban</NuxtLink>
        </div>
    </section>
</template>
