<template>
  <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white min-h-[360px] p-5 flex flex-col justify-between transition-colors duration-500">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-xl sm:text-2xl font-bold">X social collector</h1>
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input :disabled="saving || (!configured && !enabled)" v-model="enabled" type="checkbox" @change="autosave" class="h-4 w-4" />
        <span class="font-semibold">Automatic X polling</span>
      </label>
    </div>

    <fieldset :disabled="saving" class="relative flex-1 min-w-0">
      <p class="mb-3 text-sm">{{ configured ? 'X API token configured.' : 'X API token is not configured. Ask the event host to set it.' }}</p>
      <p class="mb-3 text-sm" role="status">{{ savedEnabled ? `Automatic X polling is on: every ${savedInterval} minutes while the wall is enabled.` : 'Automatic X polling is paused. Existing posts remain on the wall.' }}</p>
      <p class="mb-3 text-xs">The scheduler checks once a minute. Turning polling off stops future requests; a request already running may finish. The wall refreshes saved posts every 12 seconds without contacting X.</p>
      <p class="mb-3 text-xs">Handle queries collect posts authored by those accounts. Auto-approval applies only to collected X posts; public submissions always require approval.</p>
      <p v-if="lastPoll" class="text-xs">Last attempt: {{ lastPoll }}</p>
      <p v-if="pollError" role="status" class="text-sm text-amber-700">{{ pollError }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="x-poll-interval" class="mb-1 block">Polling interval (minutes)</label>
          <input id="x-poll-interval" v-model.number="intervalMinutes" type="number" min="1" max="180" @change="autosave" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-slate-300 transition-colors duration-500" />
        </div>
        <div>
          <label for="x-handles" class="mb-1 block">Handles to follow</label>
          <textarea id="x-handles" v-model="handles" rows="3" @change="autosave" @input="error = false, success = false" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-slate-300 transition-colors duration-500 resize-none" placeholder="@openai @hackathon"></textarea>
        </div>
      </div>

      <div>
        <label for="x-hashtags" class="mb-1 block">Hashtags to query</label>
        <textarea id="x-hashtags" v-model="hashtags" rows="4" @change="autosave" @input="error = false, success = false" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-slate-300 transition-colors duration-500 resize-none" placeholder="#hackathon #buildinpublic #dashhack"></textarea>
      </div>

      <div v-if="error" class="bg-white dark:bg-gray-800 text-red-500 relative mt-2 text-left inline-flex items-center justify-end font-bold transition-colors duration-500">
        {{ error }}
        <Icon name="i-heroicons:x-mark-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
      </div>
      <div v-if="success" class="bg-white dark:bg-gray-800 text-green-500 relative mt-2 text-left inline-flex items-center justify-end font-bold transition-colors duration-500">
        Updated!
        <Icon name="i-heroicons:check-16-solid" size="30px" class="cursor-pointer focus:outline-none" tabindex="0" />
      </div>
    </fieldset>
  </form>
</template>

<script setup>
const eventName = useState('currentEvent');
const enabled = ref(false), intervalMinutes = ref(5), hashtags = ref(''), handles = ref('');
const revision = ref(0), configured = ref(false), lastPoll = ref(null), pollError = ref('');
const savedEnabled = ref(false), savedInterval = ref(5);
const error = ref(''), success = ref(false), saving = ref(false);
function apply(wall) {
  savedEnabled.value = wall.xEnabled; savedInterval.value = wall.xPollIntervalMinutes;
  enabled.value = wall.xEnabled; intervalMinutes.value = wall.xPollIntervalMinutes;
  hashtags.value = wall.xQueryHashtags.join(', '); handles.value = wall.xQueryHandles.join(', ');
  revision.value = wall.revision; lastPoll.value = wall.xLastPollAt; pollError.value = wall.xLastPollError;
}
async function load() {
  const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`);
  if (response.status !== 200) throw new Error(response.message);
  configured.value = response.data.xConfigured; apply(response.data.wall);
}
function terms(value,prefix) { return value.split(/[,\n]+/).map(term => term.trim()).filter(Boolean).map(term => term.startsWith(prefix) ? term : prefix+term); }
async function autosave() {
  if (saving.value) return;
  saving.value = true; error.value = ''; success.value = false;
  try {
    const response = await $fetch('/api/auth/update', { method: 'POST', body: {
      username: eventName.value, setting: 'wall.xCollector', revision: revision.value,
      value: { enabled: enabled.value, intervalMinutes: intervalMinutes.value, hashtags: terms(hashtags.value,'#'), handles: terms(handles.value,'@') },
    } });
    if (response.status !== 200) {
      if (response.status === 409) await load();
      throw new Error(response.message);
    }
    apply(response.wall); success.value = true;
  } catch (failure) { error.value = failure.message || 'Could not save X collector settings.'; }
  finally { saving.value = false; }
}
onMounted(() => load().catch(failure => { error.value = failure.message; }));
</script>
