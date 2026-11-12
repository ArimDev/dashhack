<template>
    <ClientOnly>
        <div ref="cardElement" :data-notes-expanded="showNotes" :data-testid="`team-card-${team.name}`" class="mentor-team-card overflow-hidden flex h-full flex-col rounded-xl shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800 border-l-[6px]" :style="{ borderLeftColor: team.color }">

            <div class="team-card-header rounded-tr-xl px-3 py-2 flex flex-wrap items-center justify-between gap-1 bg-white dark:bg-gray-800">
                <div class="flex min-w-0 basis-32 grow flex-col">
                    <h1 class="text-base font-bold text-gray-900 dark:text-gray-100 break-words leading-snug">{{ team.name }}</h1>
                </div>

                <div class="team-toolbar flex flex-wrap items-center justify-end gap-1 shrink-0">
                    <NuxtLink :to="`/app/${encodeURIComponent(eventName)}/github-metrics#metrics-${team._id}`" data-testid="toggle-graph-btn" class="icon-button text-gray-700 dark:text-gray-200" title="GitHub metrics" aria-label="GitHub metrics">
                        <Icon name="heroicons:chart-bar" size="24px" />
                    </NuxtLink>
                    <button
                        ref="notesToggle" data-testid="toggle-notes-btn"
                        @click="toggleNotes"
                        class="icon-button p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
                        :class="{ 'text-bluey-500 bg-bluey-50 dark:bg-bluey-900/30': showNotes }"
                        title="Open issues and notes" aria-label="Notes" aria-haspopup="dialog" :aria-expanded="showNotes" :aria-controls="`team-notes-${team._id}`"
                    >
                        <Icon name="heroicons:document-text" size="22px" /><span class="px-1 text-sm font-semibold">Notes</span><span class="rounded-full bg-gray-100 px-1.5 text-xs tabular-nums dark:bg-gray-700">{{ team.stickyNotes?.length || 0 }}</span>
                    </button>

                    <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <button v-if="canEdit" aria-label="Edit team" @click="emit('edit', team)" class="icon-button p-1.5 text-gray-500 hover:text-bluey-500 transition-colors">
                        <Icon name="heroicons:pencil-square" size="16px" />
                    </button>

                    <div v-if="canEdit" class="mx-1 h-7 w-px bg-gray-300 dark:bg-gray-600" role="separator"></div>
                    <button v-if="canEdit" aria-label="Delete team" title="Delete team" @click="emit('delete', team)" class="icon-button p-1.5 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                        <Icon name="heroicons:trash" size="22px" />
                    </button>
                </div>
            </div>

            <p v-if="team.description" data-testid="team-description" class="border-t border-gray-100 px-3 py-2 text-sm whitespace-pre-wrap break-words text-gray-700 dark:border-gray-700 dark:text-gray-200">{{ team.description }}</p>
            <section v-if="team.projectAbstract?.length" aria-label="Project Abstract" class="border-t border-gray-100 px-3 py-2 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                <h2 class="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Project Abstract</h2>
                <ProjectAbstract :model-value="team.projectAbstract" read-only data-testid="team-abstract" />
            </section>
            <section v-if="team.originality" aria-label="Originalita" class="border-t border-gray-100 px-3 py-2 text-gray-800 dark:border-gray-700 dark:text-gray-200">
                <h2 class="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Originalita</h2>
                <p data-testid="team-originality" class="text-sm whitespace-pre-wrap break-words">{{ team.originality }}</p>
            </section>

            <Teleport :to="notesHost || 'body'" :disabled="!notesHost">
            <section v-if="notesLoaded" v-show="showNotes" :id="`team-notes-${team._id}`" class="mentor-notes bg-gray-50 p-3 dark:bg-gray-900/40 sm:p-4" aria-label="Team issues and notes">
                <div class="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
                    <TeamNoteLane :notes="issues" issues :team-name="team.name" :team-color="team.color" :mentors="eventData.mentors || []" :read-only="!canEdit"
                        @update="handleUpdateNote" @delete="id => emit('delete-note', { teamName: team.name, noteId: id })" @add="emit('add-note', { teamName: team.name, type: 'help_request' })" />
                    <TeamNoteLane :notes="mentorNotes" :team-name="team.name" :team-color="team.color" :mentors="eventData.mentors || []" :read-only="!canEdit"
                        @update="handleUpdateNote" @delete="id => emit('delete-note', { teamName: team.name, noteId: id })" @add="emit('add-note', { teamName: team.name, type: 'mentor_note' })" />
                </div>
                <TeamNoteLane v-if="doneNotes.length" class="mt-4" :notes="doneNotes" completed :team-name="team.name" :team-color="team.color" :mentors="eventData.mentors || []" :read-only="!canEdit"
                    @update="handleUpdateNote" @delete="id => emit('delete-note', { teamName: team.name, noteId: id })" />
            </section>
            </Teleport>
            <DialogShell v-if="showNotes" :title="team.name" drawer @close="closeNotes"><div ref="notesHost" /></DialogShell>
            <footer class="mt-auto grid grid-cols-[minmax(0,1fr)_auto] border-t border-gray-200 dark:border-gray-700">
            <NuxtLink :to="`/app/${encodeURIComponent(eventName)}/matice#matrix-${team._id}`"
                class="flex min-h-11 min-w-0 items-center gap-1.5 px-2 py-2 text-sm font-semibold text-bluey-700 hover:bg-bluey-50 dark:text-bluey-200 dark:hover:bg-gray-700">
                <Icon name="heroicons:table-cells" size="22px" /><span>Matice</span>
                <span class="rounded px-1.5 py-0.5 text-xs tabular-nums" :title="completed === 10 ? 'Hotová' : completed ? 'Rozpracovaná' : 'Nevyplněná'" :aria-label="`${completed} of 10 answers completed`" :class="completed === 10 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'">{{ completed }}/10</span>
            </NuxtLink>
            <NuxtLink :to="`/app/${encodeURIComponent(eventName)}/history?team=${team._id}`" class="flex min-h-11 items-center gap-2 border-l border-gray-200 px-3 py-2 text-sm font-semibold text-bluey-700 hover:bg-bluey-50 dark:border-gray-700 dark:text-bluey-200 dark:hover:bg-gray-700">
                <Icon name="heroicons:clipboard-document-list" size="22px" /><span>History</span>
            </NuxtLink>

            </footer>

        </div>
    </ClientOnly>
</template>

<script setup>
import {matrixCompletedCount} from '~~/shared/startupMatrix.js';

const emit = defineEmits(["edit", "delete", "add-note", "update-note", "delete-note", "refresh", "expand-notes"]);
const props = defineProps({
    team: Object,
});


const completed = computed(() => matrixCompletedCount(props.team));
const eventData = useState('eventData');
const canEdit = useState('eventCanEdit', () => false);
const showNotes = ref(false), notesLoaded = ref(false), cardElement = ref(null), notesToggle = ref(null), notesHost = ref(null);
const route = useRoute();
const eventName = ref(route.params.event);
const pendingLanes = reactive(new Map());
const actualLane = note => note.inKanban !== false && note.status === 'Done' ? 'done' : note.type === 'help_request' ? 'issues' : 'notes';
const noteLane = note => pendingLanes.get(note.id) ?? actualLane(note);
const issues = computed(() => (props.team.stickyNotes || []).filter(note => noteLane(note) === 'issues'));
const mentorNotes = computed(() => (props.team.stickyNotes || []).filter(note => noteLane(note) === 'notes'));
const doneNotes = computed(() => (props.team.stickyNotes || []).filter(note => noteLane(note) === 'done'));
function handleUpdateNote(note, done) {
    const previous = props.team.stickyNotes.find(item => item.id === note.id);
    const active = document.activeElement;
    const focusLabel = active?.closest('[data-note-id]')?.dataset.noteId === note.id ? active.getAttribute('aria-label') : null;
    // Type/status moves keep their editor mounted until the server acknowledges them.
    if (previous && actualLane(previous) !== actualLane(note)) pendingLanes.set(note.id, actualLane(previous));
    emit('update-note', { teamName: props.team.name, note, done: (ok, message) => {
        done?.(ok, message);
        nextTick(async () => {
            if (ok) pendingLanes.delete(note.id);
            await nextTick();
            if (focusLabel && document.activeElement === document.body) notesHost.value?.querySelector(`[data-note-id="${CSS.escape(note.id)}"] [aria-label="${CSS.escape(focusLabel)}"]`)?.focus({preventScroll:true});
        });
    } });
}
function toggleNotes() {
    notesLoaded.value = true;
    showNotes.value = true;
    emit('expand-notes', true);
}
function closeNotes() {
    notesHost.value = null;
    showNotes.value = false;
    emit('expand-notes', false);
}

</script>

<style>
.team-notes-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.team-toolbar .icon-button { min-width: 44px; min-height: 44px; }
.team-toolbar .iconify { width: 22px !important; height: 22px !important; }
.team-toolbar .text-gray-500 { color: var(--color-gray-700); }
.dark .team-toolbar .text-gray-500 { color: var(--color-gray-200); }
</style>
