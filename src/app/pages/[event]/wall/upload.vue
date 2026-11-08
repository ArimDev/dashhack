<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 dark:bg-slate-950 dark:text-white">
    <div class="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900 dark:shadow-cyan-950/30">
      <header class="border-b border-slate-200 bg-linear-to-br from-cyan-500/10 to-indigo-500/10 p-6 sm:p-8 dark:border-white/10">
        <p class="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">{{ eventName }} community wall</p>
        <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Share a moment</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">Add a photo, video, or a few words from the event.</p>
      </header>

      <div v-if="availability === 'checking'" role="status" class="p-8 text-center text-slate-600 dark:text-slate-300">
        Checking upload availability...
      </div>

      <div v-else-if="availability === 'unavailable'" role="status" class="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-600 dark:text-cyan-300">
          <Icon name="heroicons:information-circle" size="40px" />
        </div>
        <div>
          <h2 class="text-xl font-black">Uploads aren't available</h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Public uploads aren't available for this event right now. Please check with the event organizers.
          </p>
        </div>
      </div>

      <!-- Success state -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
          <Icon name="heroicons:check-circle" size="40px" />
        </div>
        <div>
          <h2 class="text-xl font-black">Thanks for sharing!</h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ message || 'Your post was submitted for approval.' }}</p>
        </div>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <NuxtLink :to="`/${eventName}/wall`" class="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-900 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 dark:border-white/15 dark:bg-white/10 dark:text-white sm:flex-none">
            See wall
          </NuxtLink>
          <button type="button" @click="resetForUploadAnother" class="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 sm:flex-none">
            Upload another
          </button>
        </div>
      </div>

      <!-- Form (idle / submitting / error) -->
      <form v-else class="space-y-5 p-6 sm:p-8" @submit.prevent="submitPost">
        <div v-if="status === 'error'" class="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <Icon name="heroicons:exclamation-triangle" size="20px" class="mt-0.5 shrink-0 text-red-300" />
          <div class="min-w-0">
            <p class="text-sm font-bold text-red-200">Submission failed</p>
            <p class="mt-1 text-sm text-red-300/90">{{ message }}</p>
          </div>
        </div>

        <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Your name <span class="font-normal text-slate-500 dark:text-slate-500">(optional)</span>
          <input v-model="form.authorName" type="text" maxlength="80" class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="How should we credit you?" />
        </label>

        <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Your story
          <textarea v-model="form.text" rows="4" class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Tell everyone what’s happening…" />
        </label>

        <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Add a photo or video
          <input type="file" accept="image/*,video/*" @change="handleFileChange" class="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" />
        </label>

        <div v-if="previewUrl" class="rounded-2xl border border-slate-300 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950">
          <img v-if="isImagePreview" :src="previewUrl" alt="Upload preview" class="max-h-80 w-full rounded-xl object-contain" />
          <video v-else :src="previewUrl" controls class="max-h-80 w-full rounded-xl bg-black" />
        </div>

        <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p v-if="status === 'validation'" role="status" class="text-sm text-amber-300">{{ message }}</p>
          <button type="submit" :disabled="submitting || (!form.text.trim() && !form.file)" class="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto">
            {{ submitting ? 'Submitting…' : 'Submit for approval' }}
          </button>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-500">Your post will appear after event moderators approve it.</p>
      </form>
    </div>
  </main>
</template>

<script setup>
const route = useRoute();
const eventName = computed(() => route.params.event || 'event');
const submitting = ref(false);
const availability = ref('checking');
const message = ref('');
// status: 'idle' | 'validation' | 'error' | 'success'
const status = ref('idle');
const previewUrl = ref('');
const isImagePreview = ref(true);
const form = ref({ authorName: '', text: '', file: null });

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

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  form.value.file = file;
  previewUrl.value = URL.createObjectURL(file);
  isImagePreview.value = file.type.startsWith('image/');
}

async function submitPost() {
  if (!form.value.text.trim() && !form.value.file) {
    status.value = 'validation';
    message.value = 'Add a description or choose a photo or video.';
    return;
  }

  submitting.value = true;
  message.value = '';
  try {
    const formData = new FormData();
    formData.append('authorName', form.value.authorName);
    formData.append('text', form.value.text);
    if (form.value.file) formData.append('file', form.value.file);
    const response = await $fetch(`/api/wall/${eventName.value}`, { method: 'POST', body: formData });

    if (response?.status === 200) {
      status.value = 'success';
      message.value = response.message || 'Submitted for approval.';
    } else {
      status.value = 'error';
      message.value = response?.message || 'Could not submit the post. Please try again.';
    }
  } catch (error) {
    status.value = 'error';
    message.value = error?.data?.message || 'Could not submit the post. Please try again.';
  } finally {
    submitting.value = false;
  }
}

function resetForUploadAnother() {
  form.value = { authorName: '', text: '', file: null };
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  message.value = '';
  status.value = 'idle';
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

useHead({ title: `${eventName.value} | Upload` });
</script>
