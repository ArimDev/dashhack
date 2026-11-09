<template>
  <header class="relative shrink-0 border-b border-cyan-300/20 bg-bluey-500/5 px-4 py-3 dark:border-white/10"
    :class="showSharingQr ? 'lg:min-h-36 lg:pr-44' : ''">
    <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
      {{ wallStatus === 'available' ? 'Live moments shared by the community' : 'Event wall status' }}
    </p>
    <h1 class="line-clamp-2 text-xl font-black tracking-tight sm:text-2xl lg:text-[2rem]">{{ eventName }}</h1>
    <a v-if="uploadsEnabled && wallStatus === 'available'" :href="uploadUrl" target="_blank" rel="noopener noreferrer"
      class="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/40 bg-white/90 px-3 py-2 text-sm font-semibold dark:bg-slate-900/90"
      :class="showSharingQr ? 'lg:absolute lg:right-3 lg:top-3 lg:mt-0 lg:min-h-0 lg:flex-col lg:gap-1 lg:p-2' : ''">
      <img v-if="showSharingQr && qrUrl" :src="qrUrl" alt="Scan to upload a post" width="88" height="88" class="hidden h-22 w-22 rounded bg-white p-1 lg:block" />
      <span>Share a moment</span>
    </a>
  </header>
</template>

<script setup>
defineProps({
  eventName: { type: String, required: true },
  wallStatus: { type: String, required: true },
  uploadsEnabled: Boolean,
  showSharingQr: Boolean,
  uploadUrl: { type: String, required: true },
  qrUrl: { type: String, default: '' },
});
</script>
