<template>
  <header
    class="min-h-20 rounded-b-2xl border border-cyan-300/40 bg-bluey-500/10 px-3 py-2.5 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:px-4 sm:py-3 dark:border-white/10 dark:bg-white/4 dark:shadow-black/20"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <div
          class="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300"
        >
          <span v-if="wallStatus === 'available'" class="relative flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <Icon v-else name="heroicons:information-circle" size="14px" />
          {{
            wallStatus === 'available'
              ? 'Live moments shared by the community'
              : wallStatus === 'disabled'
                ? 'Event wall unavailable'
                : 'Event wall status'
          }}
        </div>
        <h1 class="line-clamp-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl lg:text-[2rem] dark:text-white">
          {{ eventName }}
        </h1>
      </div>

      <div class="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <div class="flex flex-wrap items-center gap-2">
          <label
            class="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold transition hover:border-cyan-300/50 hover:bg-cyan-300/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-cyan-300 dark:border-white/15 dark:bg-white/10"
          >
            <span>Auto-scroll</span>
            <input
              :checked="scrollingEnabled"
              type="checkbox"
              role="switch"
              aria-label="Enable auto-scroll layout"
              class="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              @change="$emit('toggle-scroll', $event.target.checked)"
            />
            <span
              aria-hidden="true"
              class="relative h-5 w-9 rounded-full transition-colors"
              :class="scrollingEnabled ? 'bg-cyan-400' : 'bg-slate-400 dark:bg-slate-600'"
            >
              <span
                class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                :class="scrollingEnabled ? 'translate-x-4' : 'translate-x-0.5'"
              />
            </span>
          </label>

          <button
            type="button"
            class="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 dark:border-white/15 dark:bg-white/10"
            :aria-label="fullscreen ? 'Exit full screen' : 'Enter full screen'"
            :title="fullscreen ? 'Exit full screen' : 'Enter full screen'"
            @click="$emit('toggle-fullscreen')"
          >
            <Icon
              :name="fullscreen ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'"
              size="17px"
            />
          </button>

          <button
            type="button"
            class="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 dark:border-white/15 dark:bg-white/10"
            :aria-label="darkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
            :title="darkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="$emit('toggle-theme')"
          >
            <Icon :name="darkTheme ? 'heroicons:sun' : 'heroicons:moon'" size="17px" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  eventName: { type: String, required: true },
  wallStatus: { type: String, required: true },
  scrollingEnabled: { type: Boolean, required: true },
  fullscreen: { type: Boolean, required: true },
  darkTheme: { type: Boolean, required: true },
});

defineEmits(["toggle-scroll", "toggle-fullscreen", "toggle-theme"]);
</script>