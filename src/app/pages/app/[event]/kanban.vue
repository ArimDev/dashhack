<template>
    <div class="max-w-7xl mx-auto min-w-0 space-y-5 pb-8">
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
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            <section v-for="status in NOTE_STATUSES" :key="status" :data-testid="`kanban-column-${status}`"
                :aria-label="status" :aria-busy="busy" @dragenter.prevent="overColumn($event, status)" @dragover.prevent="overColumn($event, status)"
                @dragleave.self="dragOver = null" @drop.prevent="dropNote($event, status)"
                class="rounded-xl border p-3 min-h-64 transition-colors"
                :class="[status !== mobileStatus ? 'hidden md:block' : '', dragOver === status ? 'border-bluey-500 bg-bluey-50 dark:bg-bluey-950' : 'border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800/40']">
                <header class="flex items-center justify-between gap-2 px-1 pb-3">
                    <h2 class="font-semibold text-sm text-gray-700 dark:text-gray-200">{{ status }}</h2>
                    <span class="text-xs font-medium rounded-full bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5">{{ columnNotes(status).length }}</span>
                </header>
                <div class="space-y-3">
                    <article v-for="item in columnNotes(status)" :key="item.note.id" :data-testid="`kanban-note-${item.note.id}`"
                        :draggable="canEdit && !refreshing" @pointerdown.capture="rememberDragOrigin" @dragstart="startDrag($event, item)" @dragend="endDrag"
                        :class="draggedNoteId === item.note.id ? 'opacity-50' : ''">
                        <div class="flex items-center justify-between gap-2 px-1 pb-1.5">
                            <NuxtLink :to="`/app/${encodeURIComponent(currentEvent)}/teams`" class="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 min-w-0">
                                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: item.team.color }"></span>
                                <span class="truncate">{{ item.team.name }}</span>
                            </NuxtLink>
                            <button v-if="canEdit" type="button" :disabled="refreshing" :draggable="!refreshing"
                                aria-label="Drag note" title="Drag note to a column" data-testid="drag-note"
                                class="hidden md:inline-flex min-h-11 items-center text-gray-400 hover:text-bluey-500 cursor-grab active:cursor-grabbing disabled:opacity-30 px-2">
                                <Icon name="heroicons:arrows-up-down" size="16px" /><span class="ml-1 text-xs">Move</span>
                            </button>
                        </div>
                        <StickyNote :note="item.note" :mentors="data.mentors || []" :read-only="!canEdit || busy"
                            @update="note => editNote(item, note)" @delete="() => saveNote(item, null)" />
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
import { NOTE_STATUSES, noteColumn } from '~~/shared/noteStatuses.js';

definePageMeta({ layout: 'dashboard', middleware: ['routes'] });
const currentEvent = useState('currentEvent');
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
function columnNotes(status) { return visibleNotes.value.filter(item => noteColumn(item.note.status) === status); }

async function refreshBoard() {
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

function editNote(item, note) {
    const patch = {};
    for (const key of ['content', 'color', 'priority', 'status', 'type', 'creatorId', 'inKanban']) {
        if (note[key] !== item.note[key]) patch[key] = note[key];
    }
    if (Object.keys(patch).length) saveNote(item, patch);
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
        await refreshBoard();
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
