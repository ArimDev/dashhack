<template>
    <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">Event Logo</h1>
        </div>
        <div>
            <label for="url" class="mb-1">Change event logo icon:</label>
            <input v-model="value" required @change="autosave" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="url" placeholder="Valid Image URL">
        </div>
    </form>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);

const data = (await $fetch(`/api/event/${eventName.value}`)).data;

const value = ref(data.logo)

async function autosave() {
	let data = await $fetch(`/api/auth/update`, {
		method: "POST",
		body: { setting: "logo", value: value.value },
	});

	if (data.status !== 200) return console.log(data); // TODO: What's the error? AUTH API
}
</script>