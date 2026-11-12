<template>
    <div class="w-full min-w-0 space-y-3 pb-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Kanban notes</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ allNotes.length }} tracked notes across {{ data.teams.length }} teams.
                    <span v-if="canEdit"><span class="md:hidden">Change a note's status to move it.</span><span class="hidden md:inline">Drag a card or its Move handle to another column.</span></span>
                    <span v-else>Read-only board. Log in to move or edit notes.</span>
                </p>
            </div>
            <div class="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
                <label class="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Type
                    <select v-model="selectedType" aria-label="Filter by note type" :disabled="busy"
                        class="block mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
                        <option value="">All types</option>
                        <option value="help_request">Help requests</option>
                        <option value="mentor_note">Mentor notes</option>
                    </select>
                </label>
                <label class="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Team
                    <select v-model="selectedTeam" aria-label="Filter by team" :disabled="busy"
                        class="block mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm w-full max-w-full sm:max-w-56">
                        <option value="">All teams</option>
                        <option v-for="team in data.teams" :key="team._id" :value="team._id">{{ team.name }}</option>
                    </select>
                </label>
                <button @click="refreshBoard" :disabled="busy"
                    class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
                    {{ refreshing ? 'Refreshing…' : 'Refresh' }}
                </button>
                <NuxtLink :to="`/app/${encodeURIComponent(currentEvent)}/teams`"
                    class="px-3 py-2 rounded-lg bg-bluey-500 hover:bg-bluey-600 text-white text-sm">Add notes in Teams</NuxtLink>
            </div>
        </div>

        <p v-if="error" role="alert" class="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{{ error }}</p>
        <p role="status" aria-live="polite" class="text-sm text-gray-500 dark:text-gray-400 min-h-5">{{ saving ? 'Saving note…' : feedback }}</p>
        <div v-if="!allNotes.length" class="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
            <p class="font-medium">No Kanban notes yet.</p>
            <p class="text-sm mt-1">Enable “Track in Kanban” on a team note, or create a help request in Teams.</p>
        </div>

        <nav aria-label="Kanban columns" class="grid grid-cols-3 gap-2 md:hidden">
            <button v-for="status in NOTE_STATUSES" :key="status" @click="mobileStatus = status" :aria-pressed="mobileStatus === status"
                class="min-w-0 rounded-xl border px-2 py-2 text-xs font-semibold" :class="mobileStatus === status ? 'bg-bluey-500 border-bluey-500 text-white' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'">
                {{ status }} <span class="block mt-1 text-xs opacity-75">{{ columnNotes(status).length }}</span>
            </button>
        </nav>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            <section v-for="status in NOTE_STATUSES" :key="status" :data-testid="`kanban-column-${status}`"
                :aria-label="status" :aria-busy="busy" @dragenter.prevent="overColumn($event, status)" @dragover.prevent="overColumn($event, status)"
                @dragleave.self="dragOver = null" @drop.prevent="dropNote($event, status)"
                class="rounded-xl border p-2 min-h-32 transition-colors"
                :class="[status !== mobileStatus ? 'hidden md:block' : '', dragOver === status ? 'border-bluey-500 bg-bluey-50 dark:bg-bluey-950' : 'border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800/40']">
                <header class="flex items-center justify-between gap-2 px-1 pb-3">
                    <h2 class="font-semibold text-sm text-gray-700 dark:text-gray-200">{{ status }}</h2>
                    <span class="text-xs font-medium rounded-full bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5">{{ columnNotes(status).length }}</span>
                </header>
                <div class="kanban-notes-grid grid items-start gap-2">
                    <article v-for="item in columnNotes(status)" :key="item.note.id" :id="`kanban-note-${item.note.id}`" class="scroll-mt-24" :data-testid="`kanban-note-${item.note.id}`"
                        :draggable="canEdit && !refreshing" @pointerdown.capture="rememberDragOrigin" @dragstart="startDrag($event, item)" @dragend="endDrag"
                        :class="[draggedNoteId === item.note.id ? 'opacity-50' : '', route.query.note === item.note.id ? 'rounded-2xl ring-2 ring-bluey-500 ring-offset-2' : '']">
                        <StickyNote :note="item.note" :team-color="item.team.color" :mentors="data.mentors || []" :read-only="!canEdit || busy"
                            @update="(note, done) => editNote(item, note, done)" @delete="() => saveNote(item, null)">
                            <template #header>
                                <NuxtLink :to="`/app/${encodeURIComponent(currentEvent)}/teams`" data-testid="note-team-name"
                                    class="min-w-0 flex-1 break-words text-base font-bold leading-snug">{{ item.team.name }}</NuxtLink>
                                <button v-if="canEdit" type="button" :disabled="refreshing" :draggable="!refreshing"
                                    aria-label="Drag note" title="Drag note to a column" data-testid="drag-note"
                                    class="hidden md:inline-flex min-h-8 shrink-0 items-center px-1 text-xs opacity-75 hover:opacity-100 cursor-grab active:cursor-grabbing disabled:opacity-30">
                                    <Icon name="heroicons:arrows-up-down" size="16px" /><span class="sr-only">Move</span>
                                </button>
                            </template>
                        </StickyNote>
                        <div v-if="canEdit" class="mt-1 flex flex-wrap gap-1" aria-label="Move note">
                            <button v-for="target in NOTE_STATUSES.filter(value => value !== status)" :key="target" type="button"
                                :disabled="busy" @click="saveNote(item, { status: target })"
                                class="min-h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                                :aria-label="`${target === 'Done' ? 'Complete' : 'Move to ' + target}: ${item.team.name}`">
                                {{ target === 'Done' ? '✓ Complete' : target === 'To Do' ? '← To Do' : '↔ In Progress' }}
                            </button>
                        </div>
                    </article>
                    <p v-if="!columnNotes(status).length" class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                        {{ selectedTeam ? 'No matching notes' : 'No notes' }}
                    </p>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
const mobileStatus = ref('To Do');
import { NOTE_PRIORITIES, NOTE_STATUSES, noteColumn } from '~~/shared/noteStatuses.js';

definePageMeta({ layout: 'dashboard', middleware: ['routes'] });
const currentEvent = useState('currentEvent');
const route = useRoute();
const data = useState('eventData');
const canEdit = useState('eventCanEdit', () => false);
useHead({ title: computed(() => `${currentEvent.value} | Kanban | DashHack`) });

const selectedTeam = ref('');
const selectedType = ref('');
const saving = ref(false);
const refreshing = ref(false);
const busy = computed(() => saving.value || refreshing.value);
const dragOver = ref(null), draggedNoteId = ref(null);
let dragFromControl = false, pendingWrite = null;
const error = ref('');
const feedback = ref('');
const { showToast } = useToast();
const allNotes = computed(() => data.value.teams.flatMap(team => (team.stickyNotes || [])
    .filter(note => note.inKanban !== false).map(note => ({ team, note }))));
const visibleNotes = computed(() => allNotes.value.filter(item =>
    (!selectedTeam.value || item.team._id === selectedTeam.value) &&
    (!selectedType.value || (item.note.type || 'mentor_note') === selectedType.value)));
const priorityRank = new Map(NOTE_PRIORITIES.map((priority, index) => [priority, index]));
function columnNotes(status) {
    const notes = visibleNotes.value.filter(item => noteColumn(item.note.status) === status);
    if (status === 'To Do') notes.sort((a, b) =>
        (priorityRank.get(b.note.priority) ?? priorityRank.get('medium')) -
        (priorityRank.get(a.note.priority) ?? priorityRank.get('medium')));
    return notes;
}

async function focusLinkedNote() {
    if (typeof route.query.note !== 'string') return;
    const item = allNotes.value.find(item => item.note.id === route.query.note);
    if (!item) return;
    selectedTeam.value = ''; selectedType.value = ''; mobileStatus.value = noteColumn(item.note.status);
    await nextTick();
    document.getElementById(`kanban-note-${item.note.id}`)?.scrollIntoView({block:'center',behavior:'smooth'});
}
onMounted(focusLinkedNote);
watch(() => route.query.note, focusLinkedNote);
let refreshTimer;
onMounted(() => {
    refreshTimer = setInterval(() => {
        if (document.visibilityState !== 'visible' || busy.value ||
            document.querySelector('[data-note-dirty="true"], [data-note-saving="true"]') ||
            document.activeElement?.closest('input,textarea,select,[contenteditable="true"]')) return;
        refreshBoard();
    }, 15000);
});
onBeforeUnmount(() => clearInterval(refreshTimer));

async function refreshBoard(force = false) {
    if (force !== true && document.querySelector('[data-note-dirty="true"], [data-note-saving="true"]')) { error.value = 'Save your note changes before refreshing.'; return; }
    refreshing.value = true;
    try {
        const response = await $fetch(`/api/event/${encodeURIComponent(currentEvent.value)}`);
        if (response.status !== 200) throw new Error(response.message || 'Unable to refresh notes');
        data.value = response.data;
        canEdit.value = !!response.canEdit;
        if (selectedTeam.value && !data.value.teams.some(team => team._id === selectedTeam.value)) selectedTeam.value = '';
    } catch (failure) {
        error.value = failure.message || 'Unable to refresh notes';
    } finally { refreshing.value = false; }
}

async function editNote(item, note, done) {
    const patch = {};
    for (const key of ['content', 'color', 'priority', 'status', 'type', 'creatorId', 'assigneeId', 'inKanban']) {
        if (note[key] !== item.note[key]) patch[key] = note[key];
    }
    const ok = Object.keys(patch).length ? await saveNote(item, patch) : true;
    await nextTick(); done?.(ok);
}

async function saveNote(item, patch) {
    if (!canEdit.value || busy.value) return false;
    const write = persistNote(item, patch);
    pendingWrite = write;
    try { return await write; }
    finally { if (pendingWrite === write) pendingWrite = null; }
}
async function persistNote(item, patch) {
    saving.value = true;
    error.value = '';
    feedback.value = '';
    dragOver.value = null;
    try {
        const response = await $fetch(patch ? '/api/note/edit' : '/api/note/delete', {
            method: patch ? 'PATCH' : 'DELETE',
            body: { username: currentEvent.value, teamId: item.team._id, noteId: item.note.id,
                revision: item.team.revision, ...(patch ? { patch } : {}) },
        });
        if (response.status !== 200) throw new Error(response.message || 'Unable to save note');
        const team = data.value.teams.find(team => team._id === item.team._id);
        if (team) {
            team.revision = response.revision;
            if (patch) {
                const index = team.stickyNotes.findIndex(note => note.id === item.note.id);
                if (index !== -1) team.stickyNotes[index] = response.note;
            } else team.stickyNotes = team.stickyNotes.filter(note => note.id !== item.note.id);
        }
        feedback.value = patch ? 'Note saved.' : 'Note deleted.';
        return true;
    } catch (failure) {
        error.value = failure.message || 'Unable to save note';
        showToast('Could not save note', error.value);
        await refreshBoard(true);
        return false;
    } finally { saving.value = false; }
}

function rememberDragOrigin(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    dragFromControl = !!target?.closest('input,textarea,select,label,a,[contenteditable],button:not([data-testid="drag-note"])');
}
function startDrag(event, item) {
    if (!canEdit.value || refreshing.value || dragFromControl || !event.dataTransfer) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = 'move';
    const payload = JSON.stringify({ teamId: item.team._id, noteId: item.note.id });
    event.dataTransfer.setData('text/plain', payload);
    event.dataTransfer.setData('application/x-dashhack-note', payload);
    event.dataTransfer.setDragImage?.(event.currentTarget, 24, 24);
    draggedNoteId.value = item.note.id;
}
function overColumn(event, status) {
    if (!canEdit.value || refreshing.value) return;
    dragOver.value = status;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}
function endDrag() { dragOver.value = null; draggedNoteId.value = null; dragFromControl = false; }
async function dropNote(event, status) {
    dragOver.value = null;
    if (!canEdit.value || refreshing.value) return;
    let payload;
    // Read during the drop event; browsers clear DataTransfer once it returns.
    try { payload = JSON.parse(event.dataTransfer.getData('application/x-dashhack-note') || event.dataTransfer.getData('text/plain')); } catch { return; }
    if (pendingWrite && !await pendingWrite) return;
    if (!canEdit.value || busy.value) return;
    // Resolve the current team revision after the preceding text save completes.
    const item = allNotes.value.find(item => item.team._id === payload?.teamId && item.note.id === payload?.noteId);
    if (item && item.note.status !== status) await saveNote(item, { status });
}
</script>

<style scoped>
.kanban-notes-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); }
</style>
