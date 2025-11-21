<template>
    <div
        class="sticky-note p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between min-h-[160px]"
        :style="{ backgroundColor: note.color }"
    >
        <textarea
            data-testid="note-content"
            ref="textarea"
            v-model="editableContent"
            @input="autoResize"
            @blur="updateNote"
            class="bg-transparent border-none focus:ring-0 focus:outline-none resize-none w-full flex-grow text-sm font-medium text-black placeholder-black/50 overflow-hidden"
            placeholder="Write your note here..."
        ></textarea>
        
        <div class="flex justify-between items-center mt-3 pt-3 border-t border-black/10">
            <div class="flex items-center gap-2">
                <div class="relative">
                    <select 
                        v-model="editablePriority" 
                        @change="updateNote" 
                        class="appearance-none bg-black/10 hover:bg-black/20 text-black text-xs font-bold py-1 px-2 rounded cursor-pointer focus:outline-none pl-2 pr-6 transition-colors"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Med</option>
                        <option value="high">High</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-black">
                        <svg class="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>

                <div class="relative w-6 h-6 rounded-full overflow-hidden border border-black/20 cursor-pointer hover:scale-110 transition-transform">
                    <input 
                        type="color" 
                        v-model="editableColor" 
                        @input="updateNoteColor" 
                        class="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer" 
                        title="Change note color"
                    >
                </div>
            </div>

            <button data-testid="delete-note-btn" @click="$emit('delete', note.id)" class="text-black/40 hover:text-red-600 transition-colors p-1" title="Delete note">
                <Icon name="heroicons:trash" size="18px" />
            </button>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    note: {
        type: Object,
        required: true
    },
});
const emit = defineEmits(['update', 'delete']);
const textarea = ref(null);

const editableContent = ref(props.note.content);
const editablePriority = ref(props.note.priority);
const editableColor = ref(props.note.color || '#ffeb3b');

watch(() => props.note, (newNote) => {
  editableContent.value = newNote.content;
  editablePriority.value = newNote.priority;
  editableColor.value = newNote.color || '#ffeb3b';
  nextTick(autoResize);
}, { deep: true });

onMounted(() => {
    nextTick(autoResize);
});

const autoResize = () => {
    if (textarea.value) {
        textarea.value.style.height = 'auto';
        textarea.value.style.height = textarea.value.scrollHeight + 'px';
    }
};

const updateNote = () => {
    emit('update', {
        ...props.note,
        content: editableContent.value,
        priority: editablePriority.value,
        color: editableColor.value
    });
};

const updateNoteColor = (event) => {
    editableColor.value = event.target.value;
    updateNote(); 
}
</script>