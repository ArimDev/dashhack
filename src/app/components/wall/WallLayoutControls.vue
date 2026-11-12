<template>
  <fieldset class="space-y-3" :disabled="disabled">
    <legend class="mb-2 text-sm font-bold">Panel layout</legend>
    <label v-for="field in fields" :key="field.key" class="block text-sm">
      {{ field.label }}
      <select v-if="field.key === 'panelColumns'" :value="settings[field.key] ?? field.default" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900" @change="update(field.key, $event)">
        <option :value="0">Automatic (responsive)</option>
        <option v-for="count in 6" :key="count" :value="count">{{ count }} {{ count === 1 ? 'panel' : 'panels' }}</option>
      </select>
      <input v-else type="number" :min="field.min" :max="field.max" step="1" :value="settings[field.key] ?? field.default" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900" @change="update(field.key, $event)" />
    </label>
    <p class="text-xs text-slate-500">Photos keep their original proportions. Set spacing and corners to 0 for an edge-to-edge mosaic. Phones use one panel across.</p>
  </fieldset>
</template>

<script setup>
import { WALL_LAYOUT_FIELDS as fields } from '../../../shared/wallDisplay.js';
defineProps({ settings: { type: Object, required: true }, disabled: Boolean });
const emit = defineEmits(['change']);
function update(key, event) {
  const field = fields.find(field => field.key === key), value = Number(event.target.value);
  if (!event.target.value || !Number.isInteger(value) || value < field.min || value > field.max) {
    event.target.reportValidity(); return;
  }
  emit('change', { [key]: value });
}
</script>
