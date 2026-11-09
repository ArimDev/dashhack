<template>
    <section id="github-app" class="scroll-mt-4 rounded-3xl shadow-md bg-white dark:bg-gray-800 p-5 space-y-4">
        <h1 class="text-2xl font-bold">GitHub App</h1>
        <p v-if="!canEdit" class="text-sm text-gray-500">Log in to connect the event organization.</p>
        <template v-else>
            <p v-if="loading" role="status" class="text-sm">Loading GitHub connection…</p>
            <template v-else-if="info">
                <p v-if="info.connection" class="text-sm">Connected to <strong>{{ info.connection.account }}</strong>.</p>
                <p v-else class="text-sm">Connect your event organization to select repositories and show team activity.</p>
                <p v-if="!info.configured" class="text-sm text-gray-500">GitHub App connection is not available yet. Contact the event host.</p>
                <template v-if="!info.configured">
                    <GitHubSetup :missing-variables="info.missingVariables" />
                    <button @click="load" :disabled="loading" class="min-h-11 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600">Refresh setup status</button>
                </template>
                <div v-else class="flex flex-wrap gap-3 text-sm">
                    <a :href="info.installUrl" target="_blank" rel="noopener noreferrer" class="underline text-bluey-500">Install / configure App</a>
                    <button @click="connect" :disabled="busy" class="rounded-lg bg-bluey-500 hover:bg-bluey-600 text-white px-3 py-2 disabled:opacity-50">{{ busy ? 'Connecting…' : 'Connect GitHub' }}</button>
                    <button v-if="info.connection" @click="disconnect" :disabled="busy" class="underline">Disconnect from event</button>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Install once on the organization, then connect as its owner. Only granted repositories are available. Team repository links and activity totals remain visible to event visitors.</p>
            </template>
            <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        </template>
    </section>
</template>
<script setup>
const currentEvent = useState('currentEvent');
const eventData = useState('eventData');
const canEdit = useState('eventCanEdit', () => false);
const info = ref(null), loading = ref(false), busy = ref(false), error = ref('');
async function load() {
    if (!canEdit.value) return;
    loading.value = true; error.value = '';
    try {
        const response = await $fetch('/api/github/app/status', { query: { event: currentEvent.value } });
        if (response.status !== 200) throw new Error(response.message || 'Unable to load GitHub connection');
        info.value = response;
    } catch (failure) { error.value = failure.message; }
    finally { loading.value = false; }
}
onMounted(load);
watch(canEdit, load);
async function connect() {
    busy.value = true; error.value = '';
    try {
        const response = await $fetch('/api/github/app/connect', { method: 'POST', body: { event: currentEvent.value } });
        if (response.status !== 200) throw new Error(response.message || 'Unable to connect GitHub');
        window.location.assign(response.url);
    } catch (failure) { error.value = failure.message; busy.value = false; }
}
async function disconnect() {
    busy.value = true; error.value = '';
    try {
        const response = await $fetch('/api/github/app/connection', { method: 'DELETE', body: { event: currentEvent.value } });
        if (response.status !== 200) throw new Error(response.message || 'Unable to disconnect GitHub');
        eventData.value.settings.githubApp = false;
        await load();
    } catch (failure) { error.value = failure.message; }
    finally { busy.value = false; }
}
</script>
