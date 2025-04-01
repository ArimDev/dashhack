<template>
    <form class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">GitHub Token</h1>
        </div>
        <div>
            <label class="mb-1">
                <u><a href="https://github.com/settings/tokens" target="_blank">GitHub personal access token</a></u>
                <br>to access private repos and increase API requests limit:
            </label>
            <input v-model="value" type="password" autocomplete="off" required @change="autosave" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" placeholder="Valid (classic) GitHub token">
        </div>
    </form>
</template>

<script setup>
const route = useRoute();
const eventName = route.params.event;

const data = (await $fetch(`/api/event/${eventName}`)).data;

const value = ref(data.settings.githubToken)

function autosave() {
    // TODO: Token setup
}
</script>