<template>
    <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">Event Logo</h1>
        </div>
        <div class="relative">
            <label for="url" class="mb-1">Change event logo icon:</label>
            <input v-model="value" required @change="autosave" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="url" placeholder="Valid Image URL">
            <div v-if="error" class="bg-white text-red-500 absolute top-[35px] right-0 text-right mr-1 pl-2 inline-flex items-center justify-end font-bold">
                {{ error }}
                <Icon name="i-heroicons:x-mark-16-solid" size="30px" class="bg-white cursor-pointer focus:outline-none" tabindex="0" />
            </div>
        </div>
    </form>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);
const error = ref(false);

const data = (await $fetch(`/api/event/${eventName.value}`)).data;

const value = ref(data.logo);

async function autosave() {
    let data = await $fetch(`/api/auth/update`, {
        method: "POST",
        body: { setting: "logo", value: value.value },
    });

    if (data.status !== 200) return error.value = data.message + "!";
}
</script>