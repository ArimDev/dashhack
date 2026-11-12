<template>
    <ClientOnly>
        <div :data-testid="`team-card-${team.name}`" class="flex h-full flex-col rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800 border-l-[6px]" :style="{ borderLeftColor: team.color }">

            <div class="team-card-header px-3 py-2 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-gray-800">
                <div class="flex min-w-0 basis-32 grow flex-col">
                    <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100 break-words leading-snug">{{ team.name }}</h1>
                    <p v-if="!showNotes" class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mt-0.5">{{ team.description || 'No description provided.' }}</p>
                </div>

                <div class="team-toolbar flex flex-wrap items-center justify-end gap-1 shrink-0">
                    <NuxtLink :to="`/app/${encodeURIComponent(eventName)}/github-metrics#metrics-${team._id}`" data-testid="toggle-graph-btn" class="icon-button text-gray-700 dark:text-gray-200" title="GitHub metrics" aria-label="GitHub metrics">
                        <Icon name="heroicons:chart-bar" size="24px" />
                    </NuxtLink>
                    <button
                        data-testid="toggle-notes-btn"
                        @click="toggleNotes"
                        class="icon-button p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
                        :class="{ 'text-bluey-500 bg-bluey-50 dark:bg-bluey-900/30': showNotes }"
                        title="Notes" aria-label="Notes" :aria-expanded="showNotes"
                    >
                        <Icon name="heroicons:document-text" size="18px" />
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

            <div v-if="team.originality || team.projectAbstract?.length" class="border-t border-gray-100 dark:border-gray-700 px-3 py-2 space-y-2 text-gray-800 dark:text-gray-200">
                <div v-if="team.originality">
                    <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1">Originalita</h2>
                    <p data-testid="team-originality" class="text-sm whitespace-pre-wrap break-words">{{ team.originality || 'Not provided.' }}</p>
                </div>
                <details v-if="team.projectAbstract?.length" open>
                    <summary class="text-xs font-semibold text-gray-500 dark:text-gray-500 cursor-pointer mb-2">Project Abstract</summary>
                    <ProjectAbstract :model-value="team.projectAbstract" read-only data-testid="team-abstract" />
                </details>
            </div>

            <div v-if="showNotes" class="border-t border-gray-100 dark:border-gray-700/50 p-3 bg-gray-50 dark:bg-gray-900/50">
                <div class="team-notes-grid grid gap-2">
                    <StickyNote
                        v-for="note in team.stickyNotes || []"
                        :key="note.id"
                        :note="note"
                        :team-color="team.color"
                        :mentors="eventData.mentors || []"
                        :read-only="!canEdit"
                        @update="(note, done) => emit('update-note', { teamName: team.name, note, done })"
                        @delete="noteId => $emit('delete-note', { teamName: team.name, noteId })"
                    />

                    <button
                        data-testid="add-note-btn"
                        v-if="canEdit"
                        @click="emit('add-note', { teamName: team.name, type: 'mentor_note' })"
                        class="min-h-11 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2 text-gray-500 hover:text-bluey-500 dark:hover:text-bluey-400 hover:border-bluey-400 dark:hover:border-bluey-500 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group"
                        title="Add new note"
                    >
                        <Icon name="heroicons:plus" size="24px" class="group-hover:scale-110 transition-transform mb-1" />
                        <span class="text-xs font-medium">New Mentor Note</span>
                    </button>
                    <button v-if="canEdit" data-testid="add-help-btn"
                        @click="emit('add-note', { teamName: team.name, type: 'help_request' })"
                        class="min-h-11 rounded-lg border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 hover:border-amber-600">
                        <Icon name="heroicons:hand-raised" size="24px" />
                        <span class="text-xs font-medium">New Help Request</span>
                    </button>
                </div>
            </div>

            <footer class="mt-auto">
            <NuxtLink :to="`/app/${encodeURIComponent(eventName)}/matice#matrix-${team._id}`"
                class="flex min-h-11 flex-wrap items-center gap-2 border-t border-gray-200 px-3 py-2 text-sm font-semibold text-bluey-700 hover:bg-bluey-50 dark:border-gray-700 dark:text-bluey-200 dark:hover:bg-gray-700">
                <Icon name="heroicons:table-cells" size="24px" /><span>Startupová matice</span>
                <span class="ml-auto rounded-md px-2 py-1 text-xs" :class="completed === 10 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'">{{ completed === 10 ? 'Hotová' : completed ? 'Rozpracovaná' : 'Nevyplněná' }} · {{ completed }}/10</span>
            </NuxtLink>
            <NuxtLink :to="`/app/${encodeURIComponent(eventName)}/history?team=${team._id}`" class="flex min-h-11 items-center gap-2 border-t border-gray-200 px-3 py-2 text-sm font-semibold text-bluey-700 hover:bg-bluey-50 dark:border-gray-700 dark:text-bluey-200 dark:hover:bg-gray-700">
                <Icon name="heroicons:clipboard-document-list" size="24px" /><span>History</span>
            </NuxtLink>

            </footer>

        </div>
    </ClientOnly>
</template>

<script setup>
import {matrixCompletedCount} from '~~/shared/startupMatrix.js';

const emit = defineEmits(["edit", "delete", "add-note", "update-note", "delete-note", "refresh"]);
const props = defineProps({
    team: Object,
});


const completed = computed(() => matrixCompletedCount(props.team));
const eventData = useState('eventData');
const canEdit = useState('eventCanEdit', () => false);
const showNotes = ref(false);
const route = useRoute();
const eventName = ref(route.params.event);
function toggleNotes() { showNotes.value = !showNotes.value; }
</script>

<style>
.team-notes-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.team-toolbar .icon-button { min-width: 44px; min-height: 44px; }
.team-toolbar .iconify { width: 22px !important; height: 22px !important; }
.team-toolbar .text-gray-500 { color: var(--color-gray-700); }
.dark .team-toolbar .text-gray-500 { color: var(--color-gray-200); }
</style>
