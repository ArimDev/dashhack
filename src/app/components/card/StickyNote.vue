<template>
    <div class="sticky-note p-4 rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between min-h-[160px]"
        :style="{ '--team-color': teamColor }" :data-priority="editableInKanban ? editablePriority : 'none'">
        <header v-if="editableInKanban" data-testid="note-priority-header" :class="[priorityClass, editablePriority === 'critical' ? 'text-sm' : 'text-xs']" class="-mx-4 -mt-4 mb-3 flex items-center gap-2 rounded-t-[10px] px-4 py-2 font-bold">
            <Icon v-if="editablePriority === 'critical'" name="heroicons:exclamation-triangle-solid" size="20px" />
            <span>{{ priorityLabel }} priority</span>
        </header>
        <div class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-200">Type
                <select v-model="editableType" :disabled="readOnly" aria-label="Note type" @change="updateNote"
                    class="block mt-1 bg-black/5 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs rounded px-2 py-1 w-full min-w-0 max-w-full">
                    <option value="mentor_note">Mentor note</option>
                    <option value="help_request">Help request</option>
                </select>
            </label>
            <label class="text-xs font-semibold text-gray-700 dark:text-gray-200 min-w-0">Creator
                <select v-model="editableCreator" :disabled="readOnly" aria-label="Note creator" @change="updateNote"
                    class="block mt-1 bg-black/5 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs rounded px-2 py-1 w-full min-w-0 max-w-full">
                    <option value="">No creator selected</option>
                    <option v-for="mentor in mentors" :key="mentor.id" :value="mentor.id">{{ mentor.name }}</option>
                </select>
            </label>
        </div>
        <label class="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <input type="checkbox" v-model="editableInKanban" :disabled="readOnly" @change="updateNote"
                aria-label="Track in Kanban" class="accent-bluey-500">
            Track in Kanban
        </label>
        <textarea data-testid="note-content" ref="textarea" v-model="editableContent"
            :readonly="readOnly" aria-label="Note content" @input="autoResize" @blur="updateNote"
            class="bg-transparent border-none focus:ring-0 focus:outline-none resize-none w-full flex-grow text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-24 max-h-72 overflow-y-auto"
            placeholder="Write your note here..."></textarea>

        <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-black/10 dark:border-white/15 text-gray-900 dark:text-gray-100">
            <select v-if="editableInKanban" v-model="editablePriority" :disabled="readOnly" aria-label="Note priority" @change="updateNote"
                class="bg-black/5 dark:bg-gray-800 text-xs font-bold py-1 px-2 rounded cursor-pointer disabled:cursor-default">
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
            </select>
            <select v-if="editableInKanban" data-testid="note-status" v-model="editableStatus" :disabled="readOnly" aria-label="Note status" @change="updateNote"
                class="bg-black/5 dark:bg-gray-800 text-xs font-medium py-1 px-2 rounded cursor-pointer disabled:cursor-default">
                <option v-if="!NOTE_STATUSES.includes(editableStatus)" :value="editableStatus" disabled>{{ editableStatus }}</option>
                <option v-for="status in NOTE_STATUSES" :key="status" :value="status">{{ status }}</option>
            </select>
            <button v-if="!readOnly" data-testid="delete-note-btn" @click="$emit('delete', note.id)"
                class="text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors p-1 ml-auto" title="Delete note" aria-label="Delete note">
                <Icon name="heroicons:trash" size="18px" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { NOTE_STATUSES } from '~~/shared/noteStatuses.js';

const props = defineProps({
    note: { type: Object, required: true },
    teamColor: { type: String, default: '#ffeb3b' },
    readOnly: { type: Boolean, default: false },
    mentors: { type: Array, default: () => [] },
});
const emit = defineEmits(['update', 'delete']);
const textarea = ref(null);
const editableContent = ref(props.note.content);
const editablePriority = ref(props.note.priority);
const editableStatus = ref(props.note.status || 'To Do');
const editableType = ref(props.note.type || 'mentor_note');
const editableCreator = ref(props.note.creatorId || '');
const editableInKanban = ref(props.note.inKanban !== false);
const priorityLabel = computed(() => ({ low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[editablePriority.value] || 'Medium'));
const priorityClass = computed(() => ({
    low: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    medium: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
    high: 'bg-amber-300 text-amber-950 dark:bg-amber-800 dark:text-amber-50',
    critical: 'bg-[#dc2626] text-white uppercase tracking-wide',
}[editablePriority.value]));

watch(() => props.note, (note) => {
    editableContent.value = note.content;
    editablePriority.value = note.priority;
    editableStatus.value = note.status || 'To Do';
    editableType.value = note.type || 'mentor_note';
    editableCreator.value = note.creatorId || '';
    editableInKanban.value = note.inKanban !== false;
    nextTick(autoResize);
}, { deep: true });
onMounted(() => nextTick(autoResize));

function autoResize() {
    if (!textarea.value) return;
    textarea.value.style.height = 'auto';
    textarea.value.style.height = textarea.value.scrollHeight + 'px';
}
function updateNote() {
    if (props.readOnly) return;
    if (editableContent.value === props.note.content && editablePriority.value === props.note.priority &&
        editableStatus.value === (props.note.status || 'To Do') &&
        editableType.value === (props.note.type || 'mentor_note') && editableCreator.value === (props.note.creatorId || '') &&
        editableInKanban.value === (props.note.inKanban !== false)) return;
    emit('update', { ...props.note, content: editableContent.value, priority: editablePriority.value,
        status: editableStatus.value, type: editableType.value, creatorId: editableCreator.value || null,
        inKanban: editableInKanban.value });
}
</script>

<style>
.sticky-note {
    border-color: var(--team-color);
    background-color: color-mix(in srgb, var(--team-color) 22%, white);
}
.dark .sticky-note {
    background-color: color-mix(in srgb, var(--team-color) 24%, #111827);
}
.sticky-note[data-priority="critical"] {
    box-shadow: 0 0 0 3px #dc2626;
}
.sticky-note select {
    -webkit-appearance: none;
    appearance: none;
    padding-right: 1.75rem;
    background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
    background-position: calc(100% - 13px) 50%, calc(100% - 9px) 50%;
    background-size: 4px 4px;
    background-repeat: no-repeat;
}
.sticky-note select option {
    color: #111827;
    background: white;
}
.dark .sticky-note select option {
    color: #f3f4f6;
    background: #1f2937;
}
</style>
