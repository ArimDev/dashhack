<template>
    <div class="space-y-2 text-sm">
        <button type="button" @click="open = !open; loadFirst()" class="text-bluey-500 underline">Choose GitHub repository</button>
        <div v-if="open" class="rounded-xl border border-gray-300 dark:border-gray-600 p-3 space-y-3">
            <input v-model="search" aria-label="Search loaded repositories" placeholder="Search loaded repositories" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent p-2">
            <ul class="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                <li v-for="repo in filtered" :key="repo.id">
                    <button type="button" @click="$emit('select', repo.url); open = false" class="w-full text-left py-2 hover:text-bluey-500 break-all">
                        {{ repo.name }} <span v-if="repo.private" class="text-xs text-gray-500">(private)</span>
                    </button>
                </li>
            </ul>
            <p v-if="!loading && !filtered.length && !error" class="text-gray-500">No matching repositories. Check the App's repository selection on GitHub.</p>
            <p v-if="error" role="alert" class="text-red-600">{{ error }}</p>
            <button v-if="hasMore || error" type="button" @click="loadPage" :disabled="loading" class="underline">{{ loading ? 'Loading…' : error ? 'Retry' : 'Load more repositories' }}</button>
            <p v-if="loading" role="status">Loading repositories…</p>
        </div>
    </div>
</template>
<script setup>
defineEmits(['select']);
const currentEvent = useState('currentEvent');
const open = ref(false), loading = ref(false), loaded = ref(false), hasMore = ref(false);
const search = ref(''), error = ref(''), repositories = ref([]), page = ref(1);
const filtered = computed(() => repositories.value.filter(repo => repo.name.toLowerCase().includes(search.value.toLowerCase())));
function loadFirst() { if (open.value && !loaded.value && !loading.value) loadPage(); }
async function loadPage() {
    loading.value = true; error.value = '';
    try {
        const response = await $fetch('/api/github/app/repositories', { query: { event: currentEvent.value, page: page.value } });
        if (response.status !== 200) throw new Error(response.message || 'Unable to load repositories');
        repositories.value = [...new Map([...repositories.value, ...response.repositories].map(repo => [repo.id, repo])).values()];
        hasMore.value = response.hasMore; loaded.value = true; page.value++;
    } catch (failure) { error.value = failure.message; }
    finally { loading.value = false; }
}
</script>
