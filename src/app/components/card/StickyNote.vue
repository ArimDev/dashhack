<template>
    <div class="sticky-note flex min-w-0 flex-col rounded-lg border p-3 shadow-sm"
        :style="{ '--team-color': teamColor }" :data-priority="editableInKanban ? editablePriority : 'none'"
        :data-note-dirty="hasChanges || undefined" :data-note-saving="saving || undefined">
        <header v-if="editableInKanban" data-testid="note-priority-header" :class="priorityClass"
            class="-mx-3 -mt-3 mb-2 rounded-t-[10px] px-3 py-2 font-bold">
            <div v-if="$slots.header" class="mb-1 flex min-w-0 items-center justify-between gap-2 normal-case tracking-normal"><slot name="header" /></div>
            <div class="flex items-center gap-1.5 text-xs">
                <Icon v-if="editablePriority === 'critical'" name="heroicons:exclamation-triangle-solid" size="16px" />
                <span data-testid="note-priority-label">{{ priorityLabel }} priority</span>
            </div>
        </header>
        <textarea data-testid="note-content" ref="textarea" v-model="editableContent" rows="1"
            :readonly="readOnly || saving" aria-label="Note content" @input="autoResize" @blur="updateNote"
            class="min-h-10 max-h-60 w-full resize-none overflow-y-auto border-none bg-transparent text-sm font-medium leading-relaxed text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="Write your note here..."></textarea>
        <div class="mt-2 grid grid-cols-2 gap-2">
            <label v-if="!issueMode" class="min-w-0"><span class="sr-only">Note type</span>
                <select v-model="editableType" :disabled="readOnly || saving" aria-label="Note type" @change="updateNote"
                    class="block w-full min-w-0 max-w-full rounded bg-black/5 px-2 py-1 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                    <option value="mentor_note">Mentor note</option><option value="help_request">Help request</option>
                </select>
            </label>
            <label class="min-w-0" :class="{ 'col-span-2': issueMode }"><span class="sr-only">Note creator</span>
                <select v-model="editableCreator" :disabled="readOnly || saving" aria-label="Note creator" @change="updateNote"
                    class="block w-full min-w-0 max-w-full rounded bg-black/5 px-2 py-1 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                    <option value="">No creator selected</option>
                    <option v-for="mentor in mentors" :key="mentor.id" :value="mentor.id">{{ mentor.name }}</option>
                </select>
            </label>
        </div>
        <label v-if="editableInKanban" class="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"><span class="shrink-0">Assignee</span>
            <select v-model="editableAssignee" :disabled="readOnly || saving" aria-label="Note assignee" @change="updateNote"
                class="block min-h-11 w-full min-w-0 max-w-full rounded bg-black/5 px-2 py-1 text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Unassigned</option>
                <option v-for="mentor in mentors" :key="mentor.id" :value="mentor.id">{{ mentor.name }}</option>
            </select>
        </label>
        <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-200">
            <label class="flex min-w-0 items-center gap-2">
                <input ref="trackingInput" type="checkbox" :checked="issueMode ? editableType === 'help_request' : editableInKanban" :disabled="readOnly || saving" @change="changeTracking" :aria-label="issueMode ? 'Change to issue' : 'Track in Kanban'" class="accent-bluey-500">
                {{ issueMode ? editableType === 'help_request' ? 'Issue' : 'Change to issue' : 'Track in Kanban' }}
            </label>
            <select v-if="editableInKanban" v-model="editablePriority" :disabled="readOnly || saving" aria-label="Note priority" @change="updateNote"
                class="max-w-full rounded bg-black/5 px-2 py-1 text-xs font-bold dark:bg-gray-800">
                <option value="low">Low</option><option value="medium">Med</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
        </div>
        <div v-if="pendingIssueChange !== null" role="group" aria-label="Confirm conversion" class="issue-conversion-confirm mt-2 rounded bg-white p-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100" @keydown.esc.stop.prevent="cancelIssueChange">
            <p role="alert">{{ pendingIssueChange ? 'Change this note to an issue and add it to Kanban?' : 'Change this issue back to a note and remove it from Kanban?' }}</p>
            <div class="mt-2 flex flex-wrap justify-end gap-2">
                <button ref="conversionCancel" type="button" class="min-h-11 rounded px-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700" @click="cancelIssueChange">Cancel</button>
                <button type="button" class="min-h-11 rounded bg-bluey-700 px-3 font-semibold text-white hover:bg-bluey-800" @click="confirmIssueChange">{{ pendingIssueChange ? 'Change to issue' : 'Change to note' }}</button>
            </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 border-t border-black/10 pt-2 text-gray-900 dark:border-white/15 dark:text-gray-100">
            <select v-if="editableInKanban" data-testid="note-status" v-model="editableStatus" :disabled="readOnly || saving" aria-label="Note status" @change="updateNote"
                class="min-w-0 max-w-full rounded bg-black/5 px-2 py-1 text-xs font-medium dark:bg-gray-800">
                <option v-if="!NOTE_STATUSES.includes(editableStatus)" :value="editableStatus" disabled>{{ editableStatus }}</option>
                <option v-for="status in NOTE_STATUSES" :key="status" :value="status">{{ status }}</option>
            </select>
            <button v-if="!readOnly || saving" type="button" data-testid="save-note-btn" :disabled="readOnly || saving || !hasChanges"
                @pointerdown.prevent @click="updateNote" class="ml-auto min-h-8 rounded-lg bg-bluey-600 px-2 text-xs font-semibold text-white disabled:opacity-50">
                {{ saving ? 'Saving...' : saved && !hasChanges ? 'Saved' : 'Save note' }}
            </button>
            <button v-if="!readOnly" type="button" :disabled="saving" data-testid="delete-note-btn" @click="$emit('delete', note.id)"
                class="note-delete rounded-lg p-1 text-gray-500 transition-colors hover:text-red-600 disabled:opacity-40 dark:text-gray-400" :class="{ 'ml-auto': readOnly }" title="Delete note" aria-label="Delete note">
                <Icon name="heroicons:trash" size="18px" />
            </button>
        </div>
        <p v-if="saveError" aria-live="polite" class="mt-2 text-xs text-red-700 dark:text-red-300">{{ saveError }}</p>
        <span class="sr-only" aria-live="polite">{{ saving ? 'Saving note' : saved && !hasChanges ? 'Note saved' : hasChanges ? 'Unsaved note changes' : '' }}</span>
    </div>
</template>

<script setup>
import { NOTE_STATUSES } from '~~/shared/noteStatuses.js';
const props = defineProps({ note: { type: Object, required: true }, teamColor: { type: String, default: '#ffeb3b' }, readOnly: { type: Boolean, default: false }, mentors: { type: Array, default: () => [] }, issueMode:Boolean });
const emit = defineEmits(['update', 'delete']);
const textarea = ref(null), saving = ref(false), saved = ref(false), saveError = ref('');
const pendingIssueChange = ref(null), trackingInput = ref(null), conversionCancel = ref(null);
const normalize = note => ({ content: note.content || '', priority: note.priority || 'medium', status: note.status || 'To Do', type: note.type || 'mentor_note', creatorId: note.creatorId || '', assigneeId: note.assigneeId || '', inKanban: note.inKanban !== false });
const acknowledged = ref(normalize(props.note));
const editableContent = ref(acknowledged.value.content), editablePriority = ref(acknowledged.value.priority), editableStatus = ref(acknowledged.value.status);
const editableType = ref(acknowledged.value.type), editableCreator = ref(acknowledged.value.creatorId), editableInKanban = ref(acknowledged.value.inKanban);
const editableAssignee = ref(acknowledged.value.assigneeId);
const draft = () => ({ content: editableContent.value, priority: editablePriority.value, status: editableStatus.value, type: editableType.value, creatorId: editableCreator.value, assigneeId: editableAssignee.value, inKanban: editableInKanban.value });
const hasChanges = computed(() => JSON.stringify(draft()) !== JSON.stringify(acknowledged.value));
const priorityLabel = computed(() => ({ low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[editablePriority.value] || 'Medium'));
const priorityClass = computed(() => ({ low: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100', medium: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100', high: 'bg-amber-300 text-amber-950 dark:bg-amber-800 dark:text-amber-50', critical: 'bg-[#dc2626] text-white uppercase tracking-wide' }[editablePriority.value]));
function applyNote(note) {
    const value = normalize(note); acknowledged.value = value;
    editableContent.value = value.content; editablePriority.value = value.priority; editableStatus.value = value.status;
    editableType.value = value.type; editableCreator.value = value.creatorId; editableAssignee.value = value.assigneeId; editableInKanban.value = value.inKanban;
    nextTick(autoResize);
}
watch(() => props.note, note => { if (!saving.value && !hasChanges.value) applyNote(note); }, { deep: true });
onMounted(() => nextTick(autoResize));
function autoResize() {
    if (!textarea.value) return;
    textarea.value.style.height = 'auto'; textarea.value.style.height = textarea.value.scrollHeight + 'px';
}
function changeTracking(event) {
    if (props.readOnly || saving.value) return;
    if (props.issueMode) {
        pendingIssueChange.value = event.target.checked;
        event.target.checked = editableType.value === 'help_request';
        nextTick(() => conversionCancel.value?.focus());
        return;
    }
    editableInKanban.value = event.target.checked;
    updateNote();
}
function cancelIssueChange() {
    pendingIssueChange.value = null;
    trackingInput.value?.focus({preventScroll:true});
}
function confirmIssueChange() {
    if (pendingIssueChange.value === null || props.readOnly || saving.value) return;
    const issue = pendingIssueChange.value;
    pendingIssueChange.value = null;
    trackingInput.value?.focus({preventScroll:true});
    editableType.value = issue ? 'help_request' : 'mentor_note';
    editableInKanban.value = issue;
    updateNote();
}
function updateNote(event) {
    if (saveError.value && event?.type === 'blur') return;
    if (props.readOnly || saving.value || !hasChanges.value) return;
    const submitted = draft(), textChanged = submitted.content !== acknowledged.value.content;
    saving.value = true; saved.value = false; saveError.value = '';
    emit('update', { ...props.note, ...submitted, creatorId: submitted.creatorId || null, assigneeId: submitted.assigneeId || null }, (ok, message) => {
        if (ok) { acknowledged.value = submitted; saved.value = true; }
        else {
            // Reloaded server fields remain authoritative; retain unsaved issue text for an explicit retry.
            const text = editableContent.value; applyNote(props.note);
            if (textChanged) editableContent.value = text;
            saveError.value = message || (textChanged ? 'Could not save note. Your text is kept; retry Save note.' : 'Could not save note. Review the latest values and try again.');
        }
        saving.value = false; nextTick(autoResize);
    });
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
