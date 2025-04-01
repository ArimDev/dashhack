<template>
	<form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
		<div class="flex flex-row items-center gap-3 mb-4">
			<h1 class="text-3xl font-bold">Event Name</h1>
		</div>
		<div>
			<label for="username" class="mb-1">Change login username and display name of the event:</label>
			<input v-model="value" type="username" placeholder="Event Name" autocomplete="username" @change="autosave" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300">
		</div>
	</form>
</template>

<script setup>
const route = useRoute();
const value = ref(route.params.event);
const occupied = ref(false);

watch(value, (newValue) => {
	// TODO: Check if the username is available
});

async function autosave() {
	let data = await $fetch(`/api/auth/update`, {
		method: "POST",
		body: { setting: "event", value: value.value },
	});
	console.log(data);
	await navigateTo(`/app/${value.value}/settings`);
}
</script>