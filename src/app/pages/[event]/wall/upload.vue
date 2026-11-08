<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-white">
    <PublicWallUploadPanel :event-name="eventName" :availability="availability" />
  </main>
</template>

<script setup>
import PublicWallUploadPanel from "../../../components/wall/PublicWallUploadPanel.vue";

const route = useRoute();
const eventName = computed(() => route.params.event || 'event');
const availability = ref("checking");

onMounted(async () => {
  try {
    const response = await $fetch(`/api/wall/${eventName.value}`);
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
