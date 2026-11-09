<template>
  <nav aria-label="Post filters"
    class="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm overscroll-x-contain dark:border-slate-700 dark:bg-slate-900"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      :aria-pressed="activeTab === tab.id"
      :class="
        activeTab === tab.id
          ? tab.active
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      "
      class="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      @click="$emit('select', tab.id)"
    >
      <span>{{ tab.label }}</span>
      <span
        class="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold tabular-nums dark:bg-white/10"
      >
        {{ tab.count }}
      </span>
    </button>
  </nav>
</template>

<script setup>
const props = defineProps({
  activeTab: { type: String, required: true },
  stats: { type: Object, required: true },
  tabLabels: { type: Object, required: true },
});

defineEmits(["select"]);

const activeClasses = {
  all: "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  pinned: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
};

const tabs = computed(() =>
  Object.entries(props.tabLabels).map(([id, label]) => ({
    id,
    label,
    count: props.stats[id] || 0,
    active: activeClasses[id],
  }))
);
</script>