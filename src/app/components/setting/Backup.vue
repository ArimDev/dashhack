<template>
    <div @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white min-h-50 min-w-0 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-xl sm:text-2xl font-bold">Event Backup</h1>
        </div>
        <div class="relative">
            <p class="mb-1">Download a backup of this event:</p>
            <div class="flex flex-col gap-3 sm:gap-4">
                <div class="w-full">
                    <button @click="download" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 underline dark:border-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white dark:placeholder-slate-300 transition-colors duration-500">
                        Download
                    </button>
                </div>
                <div class="w-full">
                    <button disabled title="Backup upload is not available yet" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 underline dark:border-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white dark:placeholder-slate-300 transition-colors duration-500">
                        Upload unavailable
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);

function download() {
    const link = document.createElement("a");
    link.href = `/api/event/backup?event=${encodeURIComponent(eventName.value)}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
}
</script>