<template>
	<form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white min-h-[260px] p-5 flex flex-col justify-between transition-colors duration-500">
		<div class="flex flex-row items-center gap-3 mb-4">
			<h1 class="text-xl sm:text-2xl font-bold">Hashtags to Query</h1>
		</div>
		<div class="relative flex-1">
			<label class="mb-1 block">List the hashtags the wall should watch for. Add one per line or comma-separated.</label>
			<textarea v-model="value" rows="6" @change="autosave" @input="error = false, success = false" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 placeholder:text-slate-400 placeholder:font-normal placeholder:italic placeholder:opacity-75 dark:placeholder:text-slate-500 transition-colors duration-500 resize-none" placeholder="Example only: #yourhackathon"></textarea>
			<div v-if="error" class="bg-white dark:bg-gray-800 text-red-500 relative mt-2 text-left inline-flex items-center justify-end font-bold transition-colors duration-500">
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
const data = (await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`)).data;
const revision = ref(data.wall.revision);
const value = ref((data.wall?.queryHashtags || []).join(', '));

async function autosave() {
	const entries = value.value
		.split(/[,\n]+/)
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => entry.startsWith('#') ? entry : `#${entry}`);

	const response = await $fetch(`/api/auth/update`, {
		method: 'POST',
		body: {
			username: eventName.value,
            revision: revision.value,
            setting: 'wall.queryHashtags',
			value: entries,
		},
	});

	if (response.status !== 200) return error.value = response.message + '!';

	revision.value = response.wall.revision;
	success.value = true;
	return;
}
</script>
