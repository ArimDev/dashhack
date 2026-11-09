<template>
    <Teleport to="body">
        <div class="dialog-backdrop" :class="{ 'dialog-backdrop-fullscreen': fullscreen }" @click.self="emit('close')" @keydown.esc.stop.prevent="emit('close')">
            <section ref="panel" role="dialog" aria-modal="true" :aria-labelledby="headingId" tabindex="-1"
                class="dialog-panel" :class="{ 'dialog-panel-wide': wide, 'dialog-panel-fullscreen': fullscreen }" @keydown.tab="trapFocus">
                <header :class="centeredTitle ? 'grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]' : 'flex justify-between'" class="shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700 sm:px-6">
                    <h1 :id="headingId" :class="{ 'col-start-2 text-center': centeredTitle }" class="min-w-0 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{{ title }}</h1>
                    <button type="button" :class="{ 'col-start-3 justify-self-end': centeredTitle }" class="icon-button shrink-0 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close dialog" @click="emit('close')">
                        <Icon name="heroicons:x-mark" size="22px" />
                    </button>
                </header>
                <div class="dialog-content"><slot /></div>
                <footer v-if="$slots.footer" class="dialog-footer"><slot name="footer" /></footer>
            </section>
        </div>
    </Teleport>
</template>
<script setup>
defineProps({ title: { type: String, required: true }, wide: Boolean, fullscreen: Boolean, centeredTitle: Boolean });
const emit = defineEmits(['close']);
const panel = ref(null), headingId = useId();
let previousFocus, previousOverflow, previousInert;
function focusable() { return [...panel.value.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[contenteditable="true"],[tabindex="0"]')].filter(el => el.getClientRects().length); }
function trapFocus(event) {
    const elements = focusable(), first = elements[0], last = elements.at(-1);
    if (!first) { event.preventDefault(); panel.value.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.value)) { event.preventDefault(); first.focus(); }
}
onMounted(() => {
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const app = document.getElementById('__nuxt');
    previousInert = app?.inert;
    if (app) app.inert = true;
    panel.value.focus({ preventScroll: true });
});
onBeforeUnmount(() => {
    document.body.style.overflow = previousOverflow;
    const app = document.getElementById('__nuxt');
    if (app) app.inert = previousInert || false;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
});
</script>
