<template>
    <div class="sticky-note p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between min-h-[160px]"
        :style="{ backgroundColor: note.color }">
        <div class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
            <label class="text-xs font-semibold text-black/70">Type
                <select v-model="editableType" :disabled="readOnly" aria-label="Note type" @change="updateNote"
                    class="block mt-1 bg-black/10 text-black text-xs rounded px-2 py-1 w-full min-w-0 max-w-full">
                    <option value="mentor_note">Mentor note</option>
                    <option value="help_request">Help request</option>
                </select>
            </label>
            <label class="text-xs font-semibold text-black/70 min-w-0">Creator
                <select v-model="editableCreator" :disabled="readOnly" aria-label="Note creator" @change="updateNote"
                    class="block mt-1 bg-black/10 text-black text-xs rounded px-2 py-1 w-full min-w-0 max-w-full">
                    <option value="">No creator selected</option>
                    <option v-for="mentor in mentors" :key="mentor.id" :value="mentor.id">{{ mentor.name }}</option>
                </select>
            </label>
        </div>
        <label class="flex items-center gap-2 mb-3 text-xs font-semibold text-black/70">
            <input type="checkbox" v-model="editableInKanban" :disabled="readOnly" @change="updateNote"
                aria-label="Track in Kanban" class="accent-bluey-500">
            Track in Kanban
        </label>
        <textarea data-testid="note-content" ref="textarea" v-model="editableContent"
            :readonly="readOnly" aria-label="Note content" @input="autoResize" @blur="updateNote"
            class="bg-transparent border-none focus:ring-0 focus:outline-none resize-none w-full flex-grow text-sm font-medium text-black placeholder-black/50 min-h-24 max-h-72 overflow-y-auto"
            placeholder="Write your note here..."></textarea>

        <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-black/10 text-black">
            <select v-if="editableInKanban" v-model="editablePriority" :disabled="readOnly" aria-label="Note priority" @change="updateNote"
                class="bg-black/10 text-xs font-bold py-1 px-2 rounded cursor-pointer disabled:cursor-default">
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
            </select>
            <select v-if="editableInKanban" data-testid="note-status" v-model="editableStatus" :disabled="readOnly" aria-label="Note status" @change="updateNote"
                class="bg-black/10 text-xs font-medium py-1 px-2 rounded cursor-pointer disabled:cursor-default">
                <option v-if="!NOTE_STATUSES.includes(editableStatus)" :value="editableStatus" disabled>{{ editableStatus }}</option>
                <option v-for="status in NOTE_STATUSES" :key="status" :value="status">{{ status }}</option>
            </select>
            <div v-if="!readOnly" class="relative w-11 h-11 rounded-full overflow-hidden border border-black/20 cursor-pointer">
                <input type="color" v-model="editableColor" @input="updateNoteColor"
                    aria-label="Note color" title="Change note color"
                    class="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer">
            </div>
            <button v-if="!readOnly" data-testid="delete-note-btn" @click="$emit('delete', note.id)"
                class="text-black/40 hover:text-red-600 transition-colors p-1 ml-auto" title="Delete note" aria-label="Delete note">
                <Icon name="heroicons:trash" size="18px" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { NOTE_STATUSES } from '~~/shared/noteStatuses.js';

const props = defineProps({
    note: { type: Object, required: true },
    readOnly: { type: Boolean, default: false },
    mentors: { type: Array, default: () => [] },
});
const emit = defineEmits(['update', 'delete']);
const textarea = ref(null);
const editableContent = ref(props.note.content);
const editablePriority = ref(props.note.priority);
const editableColor = ref(props.note.color || '#ffeb3b');
const editableStatus = ref(props.note.status || 'To Do');
const editableType = ref(props.note.type || 'mentor_note');
const editableCreator = ref(props.note.creatorId || '');
const editableInKanban = ref(props.note.inKanban !== false);

watch(() => props.note, (note) => {
    editableContent.value = note.content;
    editablePriority.value = note.priority;
    editableColor.value = note.color || '#ffeb3b';
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
        editableColor.value === props.note.color && editableStatus.value === (props.note.status || 'To Do') &&
        editableType.value === (props.note.type || 'mentor_note') && editableCreator.value === (props.note.creatorId || '') &&
        editableInKanban.value === (props.note.inKanban !== false)) return;
    emit('update', { ...props.note, content: editableContent.value, priority: editablePriority.value,
        color: editableColor.value, status: editableStatus.value, type: editableType.value, creatorId: editableCreator.value || null,
        inKanban: editableInKanban.value });
}
function updateNoteColor(event) {
    editableColor.value = event.target.value;
    updateNote();
}
</script>
