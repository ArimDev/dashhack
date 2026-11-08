<template>
    <div class="max-w-3xl mx-auto space-y-6 pb-8">
        <div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Event mentors</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Add yourself here, then select your name as the creator of a help request or mentor note in Teams or Kanban.</p>
        </div>
        <form v-if="canEdit" @submit.prevent="addMentor" class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
            <label for="mentor-name" class="block text-sm font-medium">Your name</label>
            <div class="flex flex-wrap gap-3">
                <input id="mentor-name" v-model="name" required maxlength="80" :disabled="saving" autocomplete="name"
                    class="min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2" placeholder="Enter your name">
                <button :disabled="saving || !name.trim()" class="rounded-lg bg-bluey-500 hover:bg-bluey-600 px-4 py-2 text-white disabled:opacity-50">{{ saving ? 'Adding…' : 'Add myself' }}</button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Names are shared event labels, using the event login.</p>
        </form>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">Log in with the event password to add yourself.</p>
        <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <p role="status" aria-live="polite" class="text-sm text-gray-500 dark:text-gray-400">{{ feedback }}</p>
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <h2 class="font-semibold mb-3">Mentors ({{ mentors.length }})</h2>
            <ul v-if="mentors.length" class="divide-y divide-gray-100 dark:divide-gray-700">
                <li v-for="mentor in mentors" :key="mentor.id" class="py-3 flex items-center gap-3">
                    <Icon name="heroicons:user-circle" class="text-bluey-500 shrink-0" size="24px" />
                    <span class="break-words min-w-0">{{ mentor.name }}</span>
                </li>
            </ul>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">No mentors yet.</p>
        </div>
    </div>
</template>

<script setup>
definePageMeta({ layout: 'dashboard', middleware: ['routes'] });
const currentEvent = useState('currentEvent');
const data = useState('eventData');
const canEdit = useState('eventCanEdit', () => false);
const mentors = computed(() => [...(data.value.mentors || [])].sort((a, b) => a.name.localeCompare(b.name)));
useHead({ title: computed(() => `${currentEvent.value} | Mentors | DashHack`) });
const name = ref('');
const saving = ref(false);
const error = ref('');
const feedback = ref('');
async function addMentor() {
    if (!canEdit.value || saving.value) return;
    saving.value = true;
    error.value = '';
    feedback.value = '';
    try {
        const response = await $fetch('/api/mentor/add', { method: 'POST', body: { username: currentEvent.value, name: name.value.trim() } });
        if (response.status !== 200) throw new Error(response.message || 'Unable to add mentor');
        data.value.mentors = [...(data.value.mentors || []), response.mentor];
        name.value = '';
        feedback.value = 'You were added to the mentor list.';
    } catch (failure) { error.value = failure.message || 'Unable to add mentor'; }
    finally { saving.value = false; }
}
</script>
