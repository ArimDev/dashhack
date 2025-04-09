<template>
    <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">GitHub Token</h1>
        </div>
        <div class="relative">
            <label class="mb-1">
                <u><a href="https://github.com/settings/tokens" target="_blank">GitHub personal access token</a></u>
                <br>to access private repos and increase API requests limit:
            </label>
            <input v-model="value" type="password" autocomplete="off" required @change="autosave" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" placeholder="Valid (classic) GitHub token">
            <div v-if="error" class="bg-white text-red-500 absolute top-[58px] right-0 text-right mr-1 pl-2 inline-flex items-center justify-end font-bold">
                {{ error }}
                <Icon name="i-heroicons:x-mark-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
            </div>
        </div>
    </form>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);
const error = ref(false);

const data = (await $fetch(`/api/event/${eventName.value}`)).data;

const value = ref(data.settings.githubToken);

async function autosave() {
    let data = await $fetch(`/api/auth/update`, {
        method: "POST",
        body: { setting: "githubToken", value: value.value },
    });

    if (data.status !== 200) return error.value = data.message + "!";
}
</script>