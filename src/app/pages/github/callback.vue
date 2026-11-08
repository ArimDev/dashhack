<template>
    <main class="max-w-xl mx-auto p-6 mt-12 space-y-5 text-gray-900 dark:text-white">
        <h1 class="text-2xl font-semibold">Connect GitHub to DashHack</h1>
        <p v-if="loading" role="status">Verifying your GitHub authorization…</p>
        <p v-if="error" role="alert" class="text-red-600 dark:text-red-400">{{ error }}</p>
        <template v-if="result">
            <p>Choose the account to connect to <strong>{{ result.event }}</strong>. Event organizers can select its permitted repositories; visitors can see activity totals for repositories assigned to teams.</p>
            <button v-for="choice in result.choices" :key="choice.id" @click="connect(choice.id)" :disabled="loading"
                class="block w-full text-left border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 hover:bg-bluey-100 dark:hover:bg-gray-800">Connect {{ choice.account }}</button>
            <p v-if="!result.choices.length">No eligible installation found. Install the App on your organization first, then return to Settings and connect again. You must be an organization owner or the owner of the personal account.</p>
            <a :href="result.installUrl" target="_blank" rel="noopener noreferrer" class="block text-bluey-500 underline">Install or configure the GitHub App</a>
            <NuxtLink :to="`/app/${encodeURIComponent(result.event)}/settings`" class="block underline">Back to event Settings</NuxtLink>
        </template>
        <NuxtLink v-else-if="!loading" to="/" class="underline">Return to DashHack</NuxtLink>
    </main>
</template>
<script setup>
const route = useRoute();
const result = ref(null), loading = ref(true), error = ref('');
useHead({ title: 'Connect GitHub | DashHack', meta: [{ name: 'referrer', content: 'no-referrer' }] });
onMounted(async () => {
    const { state, code } = route.query;
    window.history.replaceState({}, '', '/github/callback');
    try {
        const response = await $fetch('/api/github/app/callback', { method: 'POST', body: { state, code } });
        if (response.status !== 200) throw new Error(response.message || 'GitHub connection failed');
        result.value = response;
    } catch (failure) { error.value = failure.message; }
    finally { loading.value = false; }
});
async function connect(installationId) {
    loading.value = true; error.value = '';
    try {
        const response = await $fetch('/api/github/app/connection', { method: 'POST', body: { selectionId: result.value.selectionId, installationId } });
        if (response.status !== 200) throw new Error(response.message || 'GitHub connection failed');
        await navigateTo(`/app/${encodeURIComponent(response.event)}/settings`);
    } catch (failure) { error.value = failure.message; }
    finally { loading.value = false; }
}
</script>
