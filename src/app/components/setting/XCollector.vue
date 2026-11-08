<template>
  <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-[360px] max-h-[360px] p-5 flex flex-col justify-between transition-colors duration-500">
    <div class="flex flex-row items-center justify-between gap-3 mb-4">
      <h1 class="text-3xl font-bold">X social collector</h1>
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input v-model="enabled" type="checkbox" @change="autosave" class="h-4 w-4" />
        <span class="font-semibold">Enabled</span>
      </label>
    </div>

    <div class="relative flex-1">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="mb-1 block">Polling interval (minutes)</label>
          <input v-model.number="intervalMinutes" type="number" min="1" max="180" @change="autosave" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300 transition-colors duration-500" />
        </div>
        <div>
          <label class="mb-1 block">Handles to follow</label>
          <textarea v-model="handles" rows="3" @change="autosave" @input="error = false, success = false" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300 transition-colors duration-500 resize-none" placeholder="@openai @hackathon"></textarea>
        </div>
      </div>

      <div>
        <label class="mb-1 block">Hashtags to query</label>
        <textarea v-model="hashtags" rows="4" @change="autosave" @input="error = false, success = false" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300 transition-colors duration-500 resize-none" placeholder="#hackathon #buildinpublic #dashhack"></textarea>
      </div>

      <div v-if="error" class="bg-white dark:bg-gray-800 text-red-500 absolute top-[35px] right-0 text-right mr-1 pl-2 inline-flex items-center justify-end font-bold transition-colors duration-500">
        {{ error }}
        <Icon name="i-heroicons:x-mark-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
      </div>
      <div v-if="success" class="bg-white dark:bg-gray-800 text-green-500 absolute top-[35px] right-0 text-right mr-1 pl-2 inline-flex items-center justify-end font-bold transition-colors duration-500">
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
const wall = data.wall || {};
const enabled = ref(Boolean(wall.xEnabled));
const intervalMinutes = ref(Number(wall.xPollIntervalMinutes || 5));
const hashtags = ref((wall.xQueryHashtags || []).join(', '));
const handles = ref((wall.xQueryHandles || []).join(', '));

async function autosave() {
  const parsedHashtags = hashtags.value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.startsWith('#') ? entry : `#${entry}`);

  const parsedHandles = handles.value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.startsWith('@') ? entry : `@${entry}`);

  const response = await $fetch('/api/auth/update', {
    method: 'POST',
    body: {
      setting: 'wall.xCollector',
      value: {
        enabled: enabled.value,
        intervalMinutes: Number(intervalMinutes.value) || 5,
        hashtags: parsedHashtags,
        handles: parsedHandles,
      },
    },
  });

  if (response.status !== 200) {
    error.value = response.message + '!';
    success.value = false;
    return;
  }

  success.value = true;
  error.value = false;
}
</script>
