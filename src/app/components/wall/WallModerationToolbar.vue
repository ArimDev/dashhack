<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h2 class="text-xl font-black">Posts · {{ activeTabLabel }}</h2>
    <div class="flex flex-wrap items-center gap-2">
      <div
        class="inline-flex items-center rounded-full border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
      >
        <button
          type="button"
          :class="sortOrder === 'newest'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-600 dark:text-slate-300'"
          class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
          @click="$emit('sort', 'newest')"
        >
          Newest first
        </button>
        <button
          type="button"
          :class="sortOrder === 'oldest'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-600 dark:text-slate-300'"
          class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
          @click="$emit('sort', 'oldest')"
        >
          Oldest first
        </button>
      </div>
      <a
        :href="`/${encodeURIComponent(currentEvent)}/wall`"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center justify-center rounded-full bg-bluey-500 px-4 py-2 text-sm font-bold text-white hover:bg-bluey-600"
      >
        Open wall
      </a>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeTabLabel: { type: String, required: true },
  currentEvent: { type: String, required: true },
  sortOrder: { type: String, required: true },
});

defineEmits(["sort"]);
</script>