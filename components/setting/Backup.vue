<template>
    <div @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">Event Backup</h1>
        </div>
        <div class="relative">
            <label for="url" class="mb-1">Download backup file of this event:</label>
            <button @click="download" @input="error = false, success = false" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black underline dark:border-white cursor-pointer dark:hover:bg-white dark:hover:text-black hover:bg-black hover:text-white dark:placeholder-slate-300 transition-colors duration-500" type="url" placeholder="Valid Image URL">Download</button>
        </div>
    </div>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);
const error = ref(false);
const success = ref(false);

async function download() {
    const link = document.createElement("a");
    link.href = `/api/event/backup?event=${eventName.value}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
}
</script>