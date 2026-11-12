<template>
  <form @submit.prevent="saveQueries" class="rounded-lg shadow-md bg-white text-black dark:bg-gray-800 dark:text-white p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-bold">Instagram social collector</h1>
      <label class="inline-flex cursor-pointer items-center gap-2">
        <input v-model="enabled" type="checkbox" :disabled="pausing || (!savedEnabled && (!loaded || saving || !configured))" @change="enabled ? save({ instagramEnabled: true }) : stop()" class="h-4 w-4" />
        Automatic Instagram polling
      </label>
    </div>
    <button type="button" :disabled="pausing" @click="stop" class="mb-3 min-h-11 rounded-lg border border-red-400 px-4 font-semibold text-red-700 dark:text-red-300 disabled:opacity-50">
      {{ pausing ? 'Stopping Instagram polling...' : 'Stop Instagram polling' }}
    </button>
    <p v-if="pauseError" role="alert" class="mb-3 text-sm text-red-600">{{ pauseError }}</p>
    <p v-if="pauseConfirmed" role="status" class="mb-3 text-sm font-semibold">Instagram polling is OFF, confirmed by the server.</p>
    <fieldset :disabled="!loaded" class="space-y-4">
      <p class="text-sm">{{ configured ? 'Captapi API key configured.' : 'Captapi API key is not configured. Ask the event host to set NUXT_CAPTAPI_API_KEY.' }}</p>
      <p role="status" class="text-sm">{{ !loaded ? 'Checking polling status...' : savedEnabled ? `Automatic Instagram polling is on: every ${savedInterval} minutes while the wall is enabled.` : 'Instagram polling is paused. Existing posts remain on the wall.' }}</p>
      <p class="text-xs">Each successful search with results costs 2 Captapi credits per hashtag. Failed or empty searches are not charged. An in-flight request may finish after stopping.</p>
      <p v-if="lastPoll" class="text-xs">Last attempt: <time :datetime="lastPoll" :title="lastPoll">{{ localDateTime(lastPoll) }}</time></p>
      <p v-if="pollError" role="status" class="text-sm text-amber-700">{{ pollError }}</p>
      <p v-if="pollError && nextPoll && savedEnabled" class="text-xs">Next automatic attempt no earlier than {{ nextPoll }}.</p>
      <p v-if="pollError && requestId" class="text-xs break-all">Captapi support request ID: {{ requestId }}</p>
      <label class="block text-sm">
        Polling interval (minutes)
        <input v-model.number="intervalMinutes" type="number" min="1" max="180" @input="success = false" class="mt-1 min-h-11 w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600" />
      </label>
      <label class="block text-sm">
        Hashtags to query
        <textarea v-model="hashtags" rows="3" @input="success = false" placeholder="Example only: #yourhackathon" class="mt-1 w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 placeholder:text-slate-400 placeholder:font-normal placeholder:italic placeholder:opacity-75 dark:placeholder:text-slate-500"></textarea>
      </label>
      <p class="mb-3 text-xs text-slate-500">Separate hashtags with spaces, commas or new lines.</p>
      <div class="flex flex-wrap gap-2">
        <button type="submit" :disabled="saving || pausing" class="min-h-11 rounded-lg bg-bluey-500 px-4 font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving...' : 'Save Instagram queries' }}</button>
        <button type="button" :disabled="saving || pausing" @click="load" class="min-h-11 rounded-lg border px-4">Reload saved settings</button>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" role="status" class="text-sm text-green-700">Saved.</p>
    </fieldset>
  </form>
</template>

<script setup>
import { localDateTime } from '../../utils/localDateTime.js';
const eventName = useState('currentEvent');
const enabled = ref(false), savedEnabled = ref(false), configured = ref(false), loaded = ref(false);
const hashtags = ref(''), intervalMinutes = ref(5), savedInterval = ref(5);
const revision = ref(0), lastPoll = ref(null), pollError = ref('');
const nextPoll = ref(null), requestId = ref('');
const saving = ref(false), pausing = ref(false), pauseConfirmed = ref(false), pauseError = ref('');
const error = ref(''), success = ref(false);
let operationVersion = 0;
function metadata(wall) {
  revision.value = wall.revision; savedEnabled.value = enabled.value = wall.instagramEnabled;
  savedInterval.value = wall.instagramPollIntervalMinutes;
  lastPoll.value = wall.instagramLastPollAt; pollError.value = wall.instagramLastPollError;
  nextPoll.value = wall.instagramNextPollAt; requestId.value = wall.instagramLastRequestId || '';
}
function apply(wall) {
  metadata(wall);
  hashtags.value = wall.instagramQueryHashtags.join(', ');
  intervalMinutes.value = wall.instagramPollIntervalMinutes;
}
function queryPatch() {
  const terms = [...new Set(hashtags.value.split(/[,\s]+/u).filter(Boolean).map(term => term.startsWith('#') ? term : `#${term}`))];
  return { instagramQueryHashtags: terms, instagramPollIntervalMinutes: intervalMinutes.value };
}
async function request(body) {
  const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`, {
    ...(body ? { method: 'POST', body } : {}), timeout: 10000,
  });
  if (response.status !== 200) throw new Error(response.status === 409
    ? 'Settings changed elsewhere. Your draft is kept. Reload saved settings before retrying.' : response.message);
  return response.data;
}
async function load() {
  if (saving.value || pausing.value) return;
  const version = operationVersion;
  saving.value = true; error.value = ''; success.value = false; pauseConfirmed.value = false;
  try {
    const data = await request();
    if (version !== operationVersion) return;
    configured.value = data.instagramConfigured; apply(data.wall); loaded.value = true;
  } catch (failure) { if (version === operationVersion) error.value = failure.message || 'Could not load Instagram settings.'; }
  finally { saving.value = false; }
}
async function save(patch) {
  if (saving.value || pausing.value || !loaded.value) return;
  const version = operationVersion;
  saving.value = true; error.value = ''; success.value = false; pauseConfirmed.value = false;
  try {
    const data = await request({ action: 'updateSettings', revision: revision.value, settings: patch });
    if (version !== operationVersion) return;
    metadata(data.wall);
    success.value = Object.hasOwn(patch, 'instagramEnabled') || JSON.stringify(patch) === JSON.stringify(queryPatch());
  } catch (failure) { if (version === operationVersion) error.value = failure.message || 'Could not save Instagram settings. Your draft is kept.'; }
  finally { enabled.value = savedEnabled.value; saving.value = false; }
}
async function stop() {
  if (pausing.value) return;
  ++operationVersion;
  pausing.value = true; pauseError.value = ''; pauseConfirmed.value = false;
  try {
    const data = await request({ action: 'pauseInstagram' });
    if (data.wall.instagramEnabled !== false) throw new Error('Server did not confirm the pause.');
    if (!loaded.value) { apply(data.wall); configured.value = data.instagramConfigured; loaded.value = true; }
    metadata(data.wall); pauseConfirmed.value = true;
  } catch (failure) { pauseError.value = `Could not confirm that Instagram polling stopped. ${failure.message || 'Retry or log in again.'}`; }
  finally { enabled.value = savedEnabled.value; pausing.value = false; }
}
function saveQueries() { return save(queryPatch()); }
onMounted(load);
</script>
