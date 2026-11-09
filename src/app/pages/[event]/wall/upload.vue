<template>
  <main class="public-upload flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-white">
    <div class="w-full max-w-2xl">
      <NuxtLink :to="`/${encodeURIComponent(eventName)}/wall`" class="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-bluey-600 dark:text-bluey-300"><Icon name="heroicons:arrow-left" size="18px" />Back to wall</NuxtLink>
      <PublicWallUploadPanel :event-name="eventName" :availability="availability" />
    </div>
  </main>
</template>

<script setup>
import PublicWallUploadPanel from "../../../components/wall/PublicWallUploadPanel.vue";

const route = useRoute();
const eventName = computed(() => route.params.event || 'event');
const availability = ref("checking");

onMounted(async () => {
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}`);
    const wall = response?.data?.wall;
    availability.value = response?.status === 200 && wall
      && wall.enabled !== false && wall.publicUploadEnabled !== false
      ? 'available'
      : 'unavailable';
  } catch {
    availability.value = 'unavailable';
  }
});

useHead({ title: `${eventName.value} | Upload` });
</script>
