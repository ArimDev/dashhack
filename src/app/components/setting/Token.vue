<template>
    <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white min-h-50 min-w-0 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-xl sm:text-2xl font-bold">GitHub Token</h1>
        </div>
        <div class="relative">
            <label class="mb-1">
                <u><a href="https://github.com/settings/tokens" target="_blank" class="hover:text-bluey-500">GitHub personal access token<Icon name="i-humbleicons:external-link" size="14px" tabindex="0" /></a></u>
                <br>to access private repos and increase API requests limit:
            </label>
            <input aria-label="GitHub personal access token" v-model="value" type="password" autocomplete="off" required @change="autosave" @input="error = false, success = false" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-slate-300 transition-colors duration-500" placeholder="Valid (classic) GitHub token">
            <div v-if="!!error" class="bg-white dark:bg-gray-800 text-red-500 relative mt-2 text-left inline-flex items-center justify-end font-bold transition-colors duration-500">
                {{ error }}
                <Icon name="i-heroicons:x-mark-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
            </div>
            <div v-if="!!success" class="bg-white dark:bg-gray-800 text-green-500 relative mt-2 text-left inline-flex items-center justify-end font-bold transition-colors duration-500">
                Updated!
                <Icon name="i-heroicons:check-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
            </div>
        </div>
    </form>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);
const error = ref(false);
const success = ref(false);

const data = (await $fetch(`/api/event/${eventName.value}`)).data;

const value = ref(data.settings.githubToken || "");

async function autosave() {
    let data = await $fetch(`/api/auth/update`, {
        method: "POST",
        body: { username: route.params.event, setting: "githubToken", value: value.value },
    });

    if (data.status !== 200) return error.value = data.message + "!";
    else return success.value = true;
}
</script>