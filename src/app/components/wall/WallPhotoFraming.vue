<template>
  <fieldset class="space-y-3">
    <legend class="font-semibold">Photo framing</legend>
    <label class="block text-sm">Photo ratio
      <select :value="modelValue.ratio" class="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 dark:bg-slate-900" @change="update('ratio', $event.target.value)">
        <option v-for="ratio in ratios" :key="ratio" :value="ratio">{{ ratio === 'original' ? 'Original proportions (no crop)' : ratio.replace('/', ':') }}</option>
      </select>
    </label>
    <template v-if="modelValue.ratio !== 'original'">
      <label class="block text-sm">Horizontal photo focus
        <input type="range" min="0" max="100" :value="modelValue.focusX" class="block min-h-11 w-full" @input="update('focusX', Number($event.target.value))" />
      </label>
      <label class="block text-sm">Vertical photo focus
        <input type="range" min="0" max="100" :value="modelValue.focusY" class="block min-h-11 w-full" @input="update('focusY', Number($event.target.value))" />
      </label>
    </template>
    <img v-if="imageUrl" :src="imageUrl" alt="Post photo preview" class="block h-auto w-full rounded-xl" :style="mediaStyle(modelValue)" />
    <p class="text-xs text-slate-500">Framing only changes the wall display. The original photo is preserved.</p>
  </fieldset>
</template>
<script setup>
import { WALL_MEDIA_RATIOS as ratios, wallMediaStyle as mediaStyle } from '../../../shared/wallMediaLayout.js';
const props = defineProps({ modelValue: { type: Object, required: true }, imageUrl: String });
const emit = defineEmits(['update:modelValue']);
function update(key, value) { emit('update:modelValue', { ...props.modelValue, [key]: value }); }
</script>
