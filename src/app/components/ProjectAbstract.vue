<template>
    <div v-if="readOnly" class="abstract-copy text-sm break-words">
        <div v-for="(block, index) in modelValue" :key="index" class="min-h-5 whitespace-pre-wrap mb-1"
            :class="{ 'flex gap-2': block.type === 'bullet' }">
            <span v-if="block.type === 'bullet'" aria-hidden="true">•</span>
            <span><span v-for="(run, runIndex) in block.runs" :key="runIndex"
                :class="{ 'font-bold': run.bold, italic: run.italic }">{{ run.text }}</span></span>
        </div>
    </div>
    <div v-else class="rounded-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
        <div role="toolbar" :aria-label="`${label} formatting`" class="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-900/30">
            <button v-for="tool in tools" :key="tool.command" type="button" @mousedown.prevent @click="format(tool.command)"
                :aria-label="`${label}: ${tool.label}`" :title="tool.label"
                class="px-3 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600" :class="tool.class">{{ tool.label }}</button>
        </div>
        <div ref="editor" contenteditable="true" role="textbox" :aria-label="label" aria-multiline="true"
            @input="publish" @blur="publish" @paste.prevent="pasteText" @drop.prevent
            class="abstract-copy min-h-32 max-h-80 overflow-y-auto p-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-bluey-500 dark:bg-gray-700"></div>
    </div>
</template>

<script setup>
const props = defineProps({ modelValue: { type: Array, default: () => [] }, readOnly: Boolean,
    label: { type: String, default: 'Project Abstract' } });
const emit = defineEmits(['update:modelValue']);
const editor = ref(null);
const tools = [
    { command: 'bold', label: 'Bold', class: 'font-bold' },
    { command: 'italic', label: 'Italic', class: 'italic' },
    { command: 'insertUnorderedList', label: 'Bullets', class: '' },
];

// Build only known DOM elements. Neither stored content nor pasted HTML is rendered as HTML.
function renderEditor() {
    if (!editor.value) return;
    const nodes = props.modelValue.map(block => {
        const element = document.createElement(block.type === 'bullet' ? 'li' : 'div');
        for (const run of block.runs) {
            let node = document.createTextNode(run.text);
            for (const tag of [...(run.bold ? ['strong'] : []), ...(run.italic ? ['em'] : [])]) {
                const wrapper = document.createElement(tag); wrapper.append(node); node = wrapper;
            }
            element.append(node);
        }
        if (!element.childNodes.length) element.append(document.createElement('br'));
        if (block.type === 'bullet') {
            const list = document.createElement('ul'); list.append(element); return list;
        }
        return element;
    });
    editor.value.replaceChildren(...nodes);
}
// The editor also remounts when a saving state switches back from read-only.
watch(editor, element => { if (element) renderEditor(); }, { flush: 'post' });
watch(() => props.modelValue, () => {
    if (document.activeElement !== editor.value) nextTick(renderEditor);
}, { deep: true });

function publish() {
    if (!editor.value) return;
    const blocks = [];
    let runs = [], type = 'paragraph';
    function flush() {
        if (runs.length) blocks.push({ type, runs });
        runs = [];
    }
    function visit(node, bold = false, italic = false) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent) runs.push({ text: node.textContent, bold, italic });
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName;
        if (tag === 'BR') { if (!runs.length) runs.push({ text: '', bold: false, italic: false }); flush(); return; }
        const block = ['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes(tag);
        if (block) { flush(); type = tag === 'LI' ? 'bullet' : 'paragraph'; }
        const nodeBold = bold || ['B', 'STRONG'].includes(tag) || ['bold', '700'].includes(node.style.fontWeight);
        const nodeItalic = italic || ['I', 'EM'].includes(tag) || node.style.fontStyle === 'italic';
        for (const child of node.childNodes) visit(child, nodeBold, nodeItalic);
        if (block) { flush(); type = 'paragraph'; }
    }
    for (const node of editor.value.childNodes) visit(node);
    flush();
    const value = blocks.some(block => block.runs.some(run => run.text.trim())) ? blocks : [];
    if (JSON.stringify(value) !== JSON.stringify(props.modelValue)) emit('update:modelValue', value);
}
function format(command) {
    editor.value?.focus();
    document.execCommand(command, false);
    publish();
}
function pasteText(event) {
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    publish();
}
</script>

<style scoped>
.abstract-copy :deep(ul) { list-style-type: disc; padding-left: 1.25rem; }
.abstract-copy :deep(b), .abstract-copy :deep(strong) { font-weight: 700; }
.abstract-copy :deep(i), .abstract-copy :deep(em) { font-style: italic; }
</style>
