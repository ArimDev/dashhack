<template>
  <fieldset class="space-y-3">
    <legend class="font-semibold">Photo framing</legend>
    <label class="block text-sm">Photo ratio
      <select :value="modelValue.ratio" class="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 dark:bg-slate-900" @change="update('ratio', $event.target.value)">
        <option v-for="ratio in ratios" :key="ratio" :value="ratio">{{ ratio === 'original' ? 'Original proportions (no crop)' : ratio.replace('/', ':') }}</option>
      </select>
    </label>
    <div v-if="imageUrl" class="relative overflow-hidden rounded-xl">
      <img :src="imageUrl" alt="Post photo preview" draggable="false" class="pointer-events-none block h-auto w-full select-none" :style="mediaStyle(modelValue)" />
      <button v-if="modelValue.ratio !== 'original'" type="button" aria-label="Photo focal point" aria-describedby="photo-focus-hint"
        :aria-description="`Horizontal ${modelValue.focusX}%, vertical ${modelValue.focusY}%`"
        class="absolute inset-0 touch-none cursor-crosshair focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-400"
        @pointerdown="startDrag" @pointermove="moveFocus" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="dragPointer = null" @keydown="moveWithKeyboard">
        <span aria-hidden="true" class="pointer-events-none absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-slate-950/60 text-2xl text-white shadow-lg" :style="{ left: `${modelValue.focusX}%`, top: `${modelValue.focusY}%` }">+</span>
      </button>
    </div>
    <p v-if="modelValue.ratio !== 'original'" id="photo-focus-hint" class="text-xs text-slate-500">Click or drag on the picture to move the focus point. Arrow keys adjust it; hold Shift for larger steps.</p>
    <p class="text-xs text-slate-500">Framing only changes the wall display. The original photo is preserved.</p>
  </fieldset>
</template>
<script setup>
import { WALL_MEDIA_RATIOS as ratios, wallMediaStyle as mediaStyle } from '../../../shared/wallMediaLayout.js';
const props = defineProps({ modelValue: { type: Object, required: true }, imageUrl: String });
const emit = defineEmits(['update:modelValue']);
function update(key, value) { emit('update:modelValue', { ...props.modelValue, [key]: value }); }
let dragPointer = null;
const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
function setFocus(focusX, focusY) { emit('update:modelValue', { ...props.modelValue, focusX: clamp(focusX), focusY: clamp(focusY) }); }
function startDrag(event) {
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
  dragPointer = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); moveFocus(event);
}
function moveFocus(event) {
  if (event.pointerId !== dragPointer) return;
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width && box.height) setFocus((event.clientX - box.left) / box.width * 100, (event.clientY - box.top) / box.height * 100);
}
function endDrag(event) {
  if (event.pointerId !== dragPointer) return;
  dragPointer = null;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
}
function moveWithKeyboard(event) {
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const direction = directions[event.key]; if (!direction) return;
  event.preventDefault(); const step = event.shiftKey ? 10 : 1;
  setFocus(props.modelValue.focusX + direction[0] * step, props.modelValue.focusY + direction[1] * step);
}
</script>
