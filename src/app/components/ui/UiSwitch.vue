<template>
  <label class="inline-flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm" :class="disabled ? 'cursor-not-allowed' : ''">
    <span><slot /></span>
    <input
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      class="peer sr-only"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span aria-hidden="true" class="relative h-6 w-11 shrink-0 rounded-full bg-slate-400 transition-colors peer-checked:bg-bluey-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-500 peer-disabled:opacity-50 dark:bg-slate-600">
      <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform" :class="{ 'translate-x-5': modelValue }" />
    </span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

defineEmits(['update:modelValue']);
</script>