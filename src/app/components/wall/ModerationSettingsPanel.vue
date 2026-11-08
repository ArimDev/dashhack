<template>
  <aside
    class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
  >
    <h2 class="mb-5 text-xl font-black">Wall settings</h2>
    <div class="space-y-4">
      <label
        class="flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300"
      >
        <span>Moderation mode</span>
        <select
          :value="settings.moderationMode"
          class="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          @change="updateSetting('moderationMode', $event.target.value); emit('save')"
        >
          <option value="auto">Auto-approve</option>
          <option value="manual">Manual-approve</option>
        </select>
      </label>

      <label
        class="flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300"
      >
        <span>Wall enabled</span>
        <input
          :checked="settings.enabled"
          type="checkbox"
          class="h-5 w-5"
          @change="updateSetting('enabled', $event.target.checked); emit('save')"
        />
      </label>

      <label
        class="flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300"
      >
        <span>Public upload</span>
        <input
          :checked="settings.publicUploadEnabled"
          type="checkbox"
          class="h-5 w-5"
          @change="updateSetting('publicUploadEnabled', $event.target.checked); emit('save')"
        />
      </label>

      <label class="block text-sm text-slate-600 dark:text-slate-300">
        Time window (minutes)
        <input
          :value="settings.windowMinutes"
          type="number"
          min="15"
          step="5"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          @change="updateNumberSetting('windowMinutes', $event); emit('save')"
        />
      </label>

      <label class="block text-sm text-slate-600 dark:text-slate-300">
        Idle rotation (seconds)
        <input
          :value="settings.idleCycleSeconds"
          type="number"
          min="5"
          step="5"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          @change="updateNumberSetting('idleCycleSeconds', $event); emit('save')"
        />
      </label>

      <label class="block text-sm text-slate-600 dark:text-slate-300">
        Filtered keywords
        <textarea
          :value="keywordsText"
          rows="3"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          @input="emit('update:keywordsText', $event.target.value)"
          @change="emit('save')"
        />
      </label>

      <label class="block text-sm text-slate-600 dark:text-slate-300">
        Blacklisted authors
        <textarea
          :value="blacklistAuthorsText"
          rows="2"
          class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          @input="emit('update:blacklistAuthorsText', $event.target.value)"
          @change="emit('save')"
        />
      </label>

      <div
        class="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200"
      >
        QR upload: <code class="break-all">{{ uploadQrUrl }}</code>
      </div>
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({
  settings: { type: Object, required: true },
  keywordsText: { type: String, required: true },
  blacklistAuthorsText: { type: String, required: true },
  uploadQrUrl: { type: String, required: true },
});

const emit = defineEmits([
  "save",
  "update:settings",
  "update:keywordsText",
  "update:blacklistAuthorsText",
]);

function updateSetting(key, value) {
  emit("update:settings", { ...props.settings, [key]: value });
}

function updateNumberSetting(key, event) {
  const { value } = event.target;
  updateSetting(key, value === "" ? "" : Number(value));
}
</script>