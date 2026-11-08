<template>
	<form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
		<div class="flex flex-row items-center gap-3 mb-4">
			<h1 class="text-3xl font-bold">Event Name</h1>
		</div>
		<div class="relative">
			<label for="username" class="mb-1">Change login username and display name of the event:</label>
			<input v-model="value" type="username" placeholder="Event Name" autocomplete="username" @change="autosave" @input="error = false, success = false" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300 transition-colors duration-500">
			<div v-if="error" class="bg-white dark:bg-gray-800 text-red-500 absolute top-[35px] right-0 text-right mr-1 pl-2 inline-flex items-center justify-end font-bold transition-colors duration-500">
				{{ error }}
				<Icon name="i-heroicons:x-mark-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
			</div>
			<div v-if="!!success" class="bg-white dark:bg-gray-800 text-green-500 absolute top-[35px] right-0 text-right mr-1 pl-2 inline-flex items-center justify-end font-bold transition-colors duration-500">
				Updated!
				<Icon name="i-heroicons:check-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
			</div>
		</div>
	</form>
</template>

<script setup>
const route = useRoute();
const value = ref(route.params.event);
const error = ref(false);
const success = ref(false);

watch(value, (newValue) => {
	// TODO: Check if the username is available
});

async function autosave() {
	let data = await $fetch(`/api/auth/update`, {
		method: "POST",
		body: { username: route.params.event, setting: "event", value: value.value },
	});

	if (data.status !== 200) return error.value = data.message + "!";

	success.value = true;
	return await navigateTo({ path: `/app/${value.value}/settings`});
}
</script>