<template>
  <span :class="badgeClass">
    <slot />
  </span>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'slate',
  },
  size: {
    type: String,
    default: 'sm',
  },
  upper: {
    type: Boolean,
    default: false,
  },
});

const baseClass =
  'inline-flex shrink-0 items-center gap-1 rounded-full font-bold';

const sizeClass = computed(() => {
  if (props.size === 'xs') return 'px-2 py-1 text-[10px]';
  if (props.size === 'md') return 'px-3 py-1.5 text-xs';
  return 'px-2.5 py-1 text-[10px]';
});

const variantClass = computed(() => {
  if (props.variant === 'cyan') {
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300';
  }
  if (props.variant === 'amber') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  }
  if (props.variant === 'inverse') {
    return 'border border-white/30 bg-white/10 text-white';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
});

const badgeClass = computed(() => [
  baseClass,
  sizeClass.value,
  variantClass.value,
  props.upper ? 'uppercase tracking-[0.15em]' : '',
]);
</script>
