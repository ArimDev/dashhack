<template>
  <section
    v-if="status === 'loading'"
    class="flex flex-1 items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-white/15 dark:bg-white/3"
  >
    <p class="text-slate-600 dark:text-slate-300">Loading the event wall...</p>
  </section>

  <section
    v-else-if="status === 'error'"
    class="flex flex-1 items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-white/15 dark:bg-white/3"
  >
    <div class="max-w-md">
      <h2 class="text-2xl font-bold">We couldn't load this event wall</h2>
      <p class="mt-2 text-slate-500 dark:text-slate-400">Please try again in a moment.</p>
    </div>
  </section>

  <section
    v-else-if="status === 'disabled'"
    class="flex flex-1 items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-white/15 dark:bg-white/3"
  >
    <div class="max-w-md">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-700 dark:text-cyan-200">
        <Icon name="heroicons:information-circle" size="30px" />
      </div>
      <h2 class="mt-5 text-2xl font-bold">The event wall isn't available</h2>
      <p class="mt-2 text-slate-500 dark:text-slate-400">
        The wall is currently unavailable for {{ eventName }}. Please check with the event organizers.
      </p>
    </div>
  </section>

  <section
    v-else
    class="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center dark:border-white/15 dark:bg-white/3"
  >
    <div class="max-w-md">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-700 dark:text-cyan-200">
        <Icon name="heroicons:photo" size="30px" />
      </div>
      <h2 class="mt-5 text-2xl font-bold">The first moment is waiting</h2>
      <p class="mt-2 text-slate-500 dark:text-slate-400">
        Scan the upload code to share what’s happening at {{ eventName }}.
      </p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  status: { type: String, required: true },
  eventName: { type: String, required: true },
});
</script>