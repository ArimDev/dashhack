<template>
    <div
        class="sticky-note p-3 rounded-lg shadow-md h-32 flex flex-col justify-between"
        :style="{ backgroundColor: note.color }"
    >
        <textarea
            v-model="editableContent"
            @blur="updateNote"
            class="bg-transparent border-none focus:ring-0 focus:outline-none resize-none w-full h-full text-sm font-medium text-black placeholder-gray-700"
            placeholder="Enter note..."
        ></textarea>
        <div class="flex justify-between items-center mt-2">
            <select v-model="editablePriority" @change="updateNote" class="bg-transparent border-none text-xs text-black focus:ring-0 focus:outline-none p-1 rounded">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </select>
            <input type="color" v-model="editableColor" @input="updateNoteColor" class="w-6 h-6 border-none cursor-pointer p-0" title="Change note color">
            <button @click="$emit('delete', note.id)" class="text-red-600 hover:text-red-800 p-1" title="Delete note">
                <Icon name="heroicons:trash-20-solid" size="18px" />
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

const editableContent = ref(props.note.content);
const editablePriority = ref(props.note.priority);
const editableColor = ref(props.note.color || '#ffeb3b');

watch(() => props.note, (newNote) => {
    editableContent.value = newNote.content;
    editablePriority.value = newNote.priority;
    editableColor.value = newNote.color || '#ffeb3b';
}, { deep: true });

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
};
</script>

<style scoped>
input[type="color"] {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    border: 1px solid #ccc;
    border-radius: 50%;
    padding: 0;
}

input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
}

input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
}
</style>