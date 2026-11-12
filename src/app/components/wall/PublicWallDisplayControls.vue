<template>
  <div ref="controls" class="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-40">
    <section v-if="open" id="wall-display-settings" aria-label="Wall display settings"
      class="mb-2 flex max-h-[calc(100dvh-5rem)] w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-xl dark:border-white/15 dark:bg-slate-900">
      <h2 class="text-sm font-bold">Wall display settings</h2>
      <WallLayoutControls :settings="layout" :disabled="layoutSaving || speedSaving" @change="$emit('set-layout', $event)" />
      <p v-if="layoutSaving" role="status" class="text-xs text-slate-500">Saving layout…</p>
      <p v-if="layoutError" role="alert" class="text-xs text-red-600 dark:text-red-400">{{ layoutError }}</p>
      <label class="relative flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-300 px-3 text-sm dark:border-white/15">
        <span>Auto-scroll</span>
        <input :checked="scrollingEnabled" type="checkbox" role="switch" aria-label="Enable auto-scroll layout"
          @change="$emit('toggle-scroll', $event.target.checked)" />
      </label>
      <label class="block text-sm">
        Scroll speed
        <select aria-label="Scroll speed" :value="scrollSpeed" :disabled="speedSaving" @change="$emit('set-speed', Number($event.target.value))" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-white/15 dark:bg-slate-900">
          <option v-if="!presets.some(preset => preset.value === scrollSpeed)" :value="scrollSpeed">Custom ({{ scrollSpeed }} px/s)</option>
          <option v-for="preset in presets" :key="preset.value" :value="preset.value">{{ preset.label }} ({{ preset.value }} px/s)</option>
        </select>
      </label>
      <p v-if="speedSaving" role="status" class="text-xs text-slate-500">Saving speed…</p>
      <p v-if="speedError" role="alert" class="text-xs text-red-600 dark:text-red-400">{{ speedError }}</p>
      <button type="button" class="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-3 text-sm dark:border-white/15"
        :aria-label="fullscreen ? 'Exit full screen' : 'Enter full screen'" @click="$emit('toggle-fullscreen')">
        <Icon :name="fullscreen ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'" size="18px" />
        {{ fullscreen ? 'Exit full screen' : 'Enter full screen' }}
      </button>
      <button type="button" class="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-3 text-sm dark:border-white/15"
        :aria-label="darkTheme ? 'Switch to light mode' : 'Switch to dark mode'" @click="$emit('toggle-theme')">
        <Icon :name="darkTheme ? 'heroicons:sun' : 'heroicons:moon'" size="18px" />
        {{ darkTheme ? 'Switch to light mode' : 'Switch to dark mode' }}
      </button>
      <label class="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
        Show sharing QR code
        <input type="checkbox" :checked="showQr" aria-label="Show sharing QR code" @change="$emit('toggle-qr', $event.target.checked)" />
      </label>
      <button type="button" :disabled="!qrAvailable" @click="$emit('open-qr'); open = false" class="min-h-11 rounded-xl border border-slate-300 px-3 text-sm disabled:opacity-40 dark:border-white/15">Expand QR code</button>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ postCount }} shared moments · Updates automatically</p>
    </section>
    <button ref="toggle" type="button" aria-label="Wall display settings" title="Wall settings" aria-controls="wall-display-settings" :aria-expanded="open"
      class="ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-400 bg-white text-bluey-600 shadow-lg transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-500 dark:border-slate-500 dark:bg-slate-900 dark:text-bluey-300"
      @click="open = !open">
      <Icon :name="open ? 'heroicons:x-mark' : 'heroicons:cog-6-tooth'" size="20px" />
    </button>
  </div>
</template>

<script setup>
import { WALL_SPEED_PRESETS as presets } from "../../../shared/wallDisplay.js";
defineProps({
  layout: { type: Object, required: true },
  layoutSaving: Boolean,
  layoutError: { type: String, default: '' },
  scrollSpeed: { type: Number, default: 40 },
  speedSaving: Boolean,
  speedError: { type: String, default: '' },
  scrollingEnabled: { type: Boolean, required: true },
  fullscreen: { type: Boolean, required: true },
  darkTheme: { type: Boolean, required: true },
  showQr: { type: Boolean, required: true },
  qrAvailable: Boolean,
  postCount: { type: Number, required: true },
});
defineEmits(['set-layout', 'set-speed', 'toggle-scroll', 'toggle-fullscreen', 'toggle-theme', 'toggle-qr', 'open-qr']);
const open = ref(false), controls = ref(null), toggle = ref(null);
function dismiss(event) {
  if (!open.value) return;
  if (event.type === 'keydown') {
    if (event.key === 'Escape') { open.value = false; toggle.value?.focus(); }
  } else if (!controls.value?.contains(event.target)) open.value = false;
}
onMounted(() => { document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', dismiss); });
onBeforeUnmount(() => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss); });
</script>
