<template>
    <details class="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
        <summary class="cursor-pointer font-semibold">Student team invitation links</summary>
        <p class="mt-3 text-sm">One reusable link per team. Students enter their own GitHub username and accept the resulting invitation. Anyone with a link can request Write access to that team's repository; share it only with that team.</p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Requires Administration: Read and write approved on the installed App. Charts and repository discovery keep their read-only tokens. Links expire after 30 days; regenerating does not revoke older links. The host can disable all links by clearing NUXT_GITHUB_TEAM_INVITE_SECRET or revoke them by rotating it.</p>
        <button @click="generate" :disabled="busy" class="mt-3 min-h-11 rounded-lg bg-bluey-500 px-3 text-sm font-semibold text-white disabled:opacity-50">{{ busy ? 'Preparing…' : 'Get team links' }}</button>
        <p v-if="error" role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <template v-if="links.length">
            <p class="mt-3 text-sm">Valid until {{ new Date(expiresAt).toLocaleDateString() }}.</p>
            <button @click="copy" class="my-2 min-h-11 text-sm text-bluey-600 underline dark:text-bluey-400">{{ copied ? 'Copied' : 'Copy all team links' }}</button>
            <div v-for="link in links" :key="link.teamId" class="mt-3 min-w-0 text-sm">
                <label v-if="link.url" class="block font-semibold">{{ link.name }}
                    <input :value="link.url" readonly @focus="$event.target.select()" class="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-2 font-normal dark:border-gray-600" />
                </label>
                <p v-else class="text-amber-700 dark:text-amber-300">{{ link.name }}: {{ link.error }}</p>
            </div>
        </template>
    </details>
</template>
<script setup>
const currentEvent = useState('currentEvent');
const links = ref([]), expiresAt = ref(null), busy = ref(false), error = ref(''), copied = ref(false);
async function generate() {
    busy.value = true; error.value = ''; copied.value = false;
    try {
        const response = await $fetch('/api/github/app/team-invites', { method: 'POST', body: { event: currentEvent.value } });
        if (response.status !== 200) throw new Error(response.message || 'Could not prepare team links.');
        links.value = response.links; expiresAt.value = response.expiresAt;
    } catch (failure) { error.value = failure.message; }
    finally { busy.value = false; }
}
async function copy() {
    try { await navigator.clipboard.writeText(links.value.filter(link => link.url).map(link => `${link.name}\t${link.url}`).join('\n')); copied.value = true; }
    catch { error.value = 'Clipboard is unavailable. Select and copy each link below.'; }
}
</script>
