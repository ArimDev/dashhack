<template>
    <Teleport to="body">
        <div ref="backdrop" class="dialog-backdrop" :class="{ 'dialog-backdrop-fullscreen': fullscreen, 'dialog-backdrop-drawer': drawer }"
            @pointerdown="beginBackdropClick" @pointerup="endBackdropClick" @pointercancel="cancelBackdropClick"
            @click.self="closeFromBackdrop" @keydown.esc.stop.prevent="requestClose">
            <section ref="panel" role="dialog" aria-modal="true" :aria-labelledby="headingId" tabindex="-1"
                class="dialog-panel" :class="{ 'dialog-panel-wide': wide, 'dialog-panel-fullscreen': fullscreen }" @keydown.tab="trapFocus">
                <button v-if="drawer" type="button" class="drawer-collapse-rail" aria-label="Collapse notes panel" title="Collapse notes panel" :disabled="closing" @click="requestClose"><Icon name="heroicons:chevron-double-right" size="20px" /></button>
                <header :class="centeredTitle ? 'grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]' : 'flex justify-between'" class="shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700 sm:px-6">
                    <h1 :id="headingId" :class="{ 'col-start-2 text-center': centeredTitle }" class="min-w-0 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{{ title }}</h1>
                    <button type="button" :class="{ 'col-start-3 justify-self-end': centeredTitle }" class="icon-button shrink-0 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close dialog" @click="requestClose">
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
const props = defineProps({ title: { type: String, required: true }, wide: Boolean, fullscreen: Boolean, centeredTitle: Boolean, drawer: Boolean });
const emit = defineEmits(['close']);
const panel = ref(null), backdrop = ref(null), closing = ref(false), headingId = useId();
let animations = [], unmounted = false;
const motionEnabled = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
async function requestClose() {
    if (closing.value) return;
    if (!props.drawer || !motionEnabled()) { emit('close'); return; }
    closing.value = true;
    const transform = getComputedStyle(panel.value).transform;
    const opacity = getComputedStyle(backdrop.value).opacity;
    animations.forEach(animation => animation.cancel());
    animations = [
        panel.value.animate([{transform}, {transform:'translateX(100%)'}], {duration:180, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'}),
        backdrop.value.animate([{opacity}, {opacity:0}], {duration:180, fill:'forwards'}),
    ];
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    if (!unmounted) emit('close');
}
let previousFocus, previousOverflow, previousInert;
let pointerStart = null, backdropClick = false;
function beginBackdropClick(event) {
    backdropClick = false;
    pointerStart = event.button === 0 && event.target === event.currentTarget
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
}
function endBackdropClick(event) {
    backdropClick = !!pointerStart && pointerStart.id === event.pointerId && event.target === event.currentTarget
        && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) <= 8;
    pointerStart = null;
}
function cancelBackdropClick() { pointerStart = null; backdropClick = false; }
function closeFromBackdrop() {
    const shouldClose = backdropClick;
    cancelBackdropClick();
    if (shouldClose) requestClose();
}
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
    if (props.drawer && motionEnabled()) animations = [
        panel.value.animate([{transform:'translateX(100%)'}, {transform:'translateX(0)'}], {duration:240, easing:'cubic-bezier(.2,.8,.2,1)'}),
        backdrop.value.animate([{opacity:0}, {opacity:1}], {duration:200}),
    ];
});
onBeforeUnmount(() => {
    unmounted = true;
    animations.forEach(animation => animation.cancel());
    document.body.style.overflow = previousOverflow;
    const app = document.getElementById('__nuxt');
    if (app) app.inert = previousInert || false;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
});
</script>
