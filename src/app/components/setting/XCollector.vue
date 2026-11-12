<template>
  <form @submit.prevent="saveQuery" class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white min-h-[360px] p-5 flex flex-col justify-between transition-colors duration-500">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 class="text-xl sm:text-2xl font-bold">X social collector</h1>
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input :disabled="pausing || (!savedEnabled && (!loaded || saving || !configured))" v-model="enabled" type="checkbox" @change="savePolling" class="h-4 w-4" />
        <span class="font-semibold">Automatic X polling</span>
      </label>
    </div>

    <button type="button" :disabled="pausing" @click="pausePolling" class="mb-4 min-h-11 rounded-xl border border-red-400 px-4 font-semibold text-red-700 dark:text-red-300 disabled:opacity-50">{{ pausing ? 'Stopping X polling…' : 'Stop X polling' }}</button>
    <p v-if="pauseError" role="alert" class="mb-3 text-sm text-red-600">{{ pauseError }}</p>
    <p v-if="pauseConfirmed" role="status" class="mb-3 text-sm font-semibold">X polling is OFF — confirmed by the server. No new automatic X API requests.</p>
    <fieldset :disabled="!loaded" class="relative flex-1 min-w-0">
      <p class="mb-3 text-sm">{{ configured ? 'X API token configured.' : 'X API token is not configured. Ask the event host to set it.' }}</p>
      <p class="mb-3 text-sm" role="status">{{ !loaded ? 'Checking polling status…' : savedEnabled ? `Automatic X polling is on: every ${savedInterval} minutes while the wall is enabled.` : 'Automatic X polling is paused. Existing posts remain on the wall.' }}</p>
      <p class="mb-3 text-xs">The scheduler checks once a minute. Turning polling off stops future requests; a request already running may finish. The wall refreshes saved posts every 12 seconds without contacting X.</p>
      <p class="mb-3 text-xs">Handle queries collect posts authored by those accounts. Auto-approval applies to all collected posts; public submissions always require approval.</p>
      <p v-if="lastPoll" class="text-xs">Last attempt: <time :datetime="lastPoll" :title="lastPoll">{{ localDateTime(lastPoll) }}</time></p>
      <p v-if="pollError" role="status" class="text-sm text-amber-700">{{ pollError }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="x-poll-interval" class="mb-1 block">Polling interval (minutes)</label>
          <input id="x-poll-interval" v-model.number="intervalMinutes" type="number" min="1" max="180" @input="markEdited" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-slate-300 transition-colors duration-500" />
        </div>
        <div>
          <label for="x-handles" class="mb-1 block">Handles to follow</label>
          <textarea id="x-handles" aria-describedby="x-handles-hint" v-model="handles" rows="3" @input="markEdited" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 placeholder:text-slate-400 placeholder:font-normal placeholder:italic placeholder:opacity-75 dark:placeholder:text-slate-500 transition-colors duration-500 resize-none" placeholder="Example only: @your_event"></textarea>
          <p id="x-handles-hint" class="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400"><span v-if="loaded && !handles.trim()">No handles entered. </span>Posts by these accounts. Use @handles, separated by spaces, commas or new lines. Optional.</p>
        </div>
      </div>

      <div>
        <label for="x-hashtags" class="mb-1 block">Hashtags to query</label>
        <textarea id="x-hashtags" v-model="hashtags" rows="4" @input="markEdited" class="mb-4 p-3 border-2 rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 placeholder:text-slate-400 placeholder:font-normal placeholder:italic placeholder:opacity-75 dark:placeholder:text-slate-500 transition-colors duration-500 resize-none" placeholder="Example only: #yourhackathon"></textarea>
      </div>

      <p class="mt-2 text-xs">Separate hashtags and accounts with spaces, commas or new lines. Changes are saved only when you choose Save queries.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="submit" :disabled="saving" class="min-h-11 rounded-xl bg-blue-600 px-4 font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save queries' }}</button>
        <button type="button" :disabled="saving" @click="load" class="min-h-11 rounded-xl border px-4">Reload saved settings</button>
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
import { localDateTime } from '../../utils/localDateTime.js';
const eventName = useState('currentEvent');
const enabled = ref(false), intervalMinutes = ref(5), hashtags = ref(''), handles = ref('');
const revision = ref(0), configured = ref(false), lastPoll = ref(null), pollError = ref('');
const savedEnabled = ref(false), savedInterval = ref(5);
const error = ref(''), success = ref(false), saving = ref(false), loaded = ref(false);
const pausing = ref(false), pauseConfirmed = ref(false), pauseError = ref('');
let operationVersion = 0;
function markEdited() { success.value = false; }
function apply(wall) {
  pauseConfirmed.value = false;
  savedEnabled.value = wall.xEnabled; savedInterval.value = wall.xPollIntervalMinutes;
  enabled.value = wall.xEnabled; intervalMinutes.value = wall.xPollIntervalMinutes;
  hashtags.value = wall.xQueryHashtags.join(', '); handles.value = wall.xQueryHandles.join(', ');
  revision.value = wall.revision; lastPoll.value = wall.xLastPollAt; pollError.value = wall.xLastPollError;
}
async function load() {
  if (saving.value) return;
  const version = operationVersion;
  saving.value = true; error.value = ''; success.value = false;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`, { timeout: 10000 });
    if (version !== operationVersion) return;
    if (response.status !== 200) throw new Error(response.message);
    configured.value = response.data.xConfigured; apply(response.data.wall); loaded.value = true;
  } catch (failure) { if (version === operationVersion) error.value = failure.message || 'Could not load X settings.'; }
  finally { saving.value = false; }
}
function terms(value,prefix) { return [...new Set(value.split(/[,\s]+/u).map(term => term.trim()).filter(Boolean).map(term => term.startsWith(prefix) ? term : prefix+term))]; }
function queryPatch() { return { xPollIntervalMinutes: intervalMinutes.value, xQueryHashtags: terms(hashtags.value,'#'), xQueryHandles: terms(handles.value,'@') }; }
async function save(patch) {
  if (saving.value || pausing.value || !loaded.value) return;
  const version = operationVersion;
  pauseConfirmed.value = false;
  saving.value = true; error.value = ''; success.value = false;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`, { method: 'POST', body: {
      action: 'updateSettings', revision: revision.value, settings: patch,
    }, timeout: 10000 });
    if (version !== operationVersion) return;
    if (response.status !== 200) throw new Error(response.status === 409
      ? 'Settings changed elsewhere. Your draft is kept. Reload saved settings to review the latest values.' : response.message);
    // Only update saved metadata; never replace text while someone is editing it.
    const wall = response.data.wall;
    revision.value = wall.revision; savedEnabled.value = wall.xEnabled; savedInterval.value = wall.xPollIntervalMinutes;
    lastPoll.value = wall.xLastPollAt; pollError.value = wall.xLastPollError;
    success.value = Object.hasOwn(patch,'xEnabled') || JSON.stringify(patch) === JSON.stringify(queryPatch());
  } catch (failure) { if (version === operationVersion) error.value = failure.message || 'Could not save X collector settings. Your draft is kept.'; }
  finally { enabled.value = savedEnabled.value; saving.value = false; }
}
async function pausePolling() {
  if (pausing.value) return;
  ++operationVersion;
  pausing.value = true; pauseError.value = ''; pauseConfirmed.value = false;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`, {
      method: 'POST', body: { action: 'pauseX' }, timeout: 10000,
    });
    if (response.status !== 200 || response.data?.wall?.xEnabled !== false) throw new Error(response.message || 'Server did not confirm the pause.');
    const wall = response.data.wall;
    if (!loaded.value) { apply(wall); configured.value = response.data.xConfigured; loaded.value = true; }
    revision.value = wall.revision; savedEnabled.value = enabled.value = false;
    savedInterval.value = wall.xPollIntervalMinutes;
    lastPoll.value = wall.xLastPollAt; pollError.value = wall.xLastPollError;
    pauseConfirmed.value = true;
  } catch (failure) { pauseError.value = `Could not confirm that X polling stopped. ${failure.message || 'Retry or log in again.'}`; }
  finally { enabled.value = savedEnabled.value; pausing.value = false; }
}
function saveQuery() { return save(queryPatch()); }
function savePolling() { return enabled.value ? save({ xEnabled: true }) : pausePolling(); }
onMounted(load);
</script>
