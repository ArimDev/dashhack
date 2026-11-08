<template>
  <div class="space-y-6">
    <p v-if="!canEdit" role="status">Log in to this event to moderate its social wall.</p>
    <p v-if="error" role="alert" class="text-red-600 dark:text-red-400">{{ error }}</p>
    <fieldset v-if="canEdit" :disabled="busy" class="space-y-6 min-w-0">
    <button class="rounded-lg border px-3 py-2" @click="loadSocialWall">Refresh posts</button>
    <WallModerationTabBar
      :active-tab="activeTab"
      :stats="stats"
      :tab-labels="tabLabel"
      @select="activeTab = $event"
    />

    <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <WallModerationSettingsPanel
        :settings="settings"
        :keywords-text="keywordsText"
        :blacklist-authors-text="blacklistAuthorsText"
        :upload-qr-url="uploadQrUrl"
        @update:settings="settings = $event"
        @update:keywords-text="keywordsText = $event"
        @update:blacklist-authors-text="blacklistAuthorsText = $event"
        @save="saveSettings"
      />

      <section class="space-y-4">
        <WallModerationToolbar
          :active-tab-label="tabLabel[activeTab]"
          :current-event="currentEvent"
          :sort-order="sortOrder"
          @sort="sortOrder = $event"
        />

        <div
          v-if="!filteredPosts.length"
          class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          No {{ tabLabel[activeTab].toLowerCase() }} posts.
        </div>

        <div v-else class="grid gap-4">
          <WallModerationPostCard
            v-for="post in filteredPosts"
            :key="post.id"
            :post="post"
            :menu-open="openMenuId === post.id"
            :expired="isOutsideWindow(post)"
            @action="applyPostAction(post.id, $event)"
            @toggle-menu="toggleMenu(post.id)"
            @close-menu="openMenuId = null"
            @delete="confirmDelete(post.id)"
          />
        </div>
      </section>
    </div>
    </fieldset>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'dashboard', middleware: ['routes'] });
const currentEvent = useState('currentEvent');
const canEdit = useState('eventCanEdit');
const posts = ref([]), stats = ref({}), settings = ref({});
const keywordsText = ref(''), blacklistAuthorsText = ref('');
const openMenuId = ref(null), activeTab = ref('all'), sortOrder = ref('newest');
const busy = ref(false), error = ref('');
const uploadQrUrl = computed(() => import.meta.client ? `${window.location.origin}/${encodeURIComponent(currentEvent.value)}/wall/upload` : '');
const tabLabel = { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', pinned: 'Pinned' };
const filteredPosts = computed(() => posts.value.filter(post => activeTab.value === 'all' ||
  (activeTab.value === 'pinned' ? post.pinned : post.status === activeTab.value)).sort((a,b) =>
  (sortOrder.value === 'oldest' ? 1 : -1) * (Date.parse(a.createdAt)-Date.parse(b.createdAt))));
function isOutsideWindow(post) { return Date.now()-Date.parse(post.createdAt) > (settings.value.windowMinutes || 1440)*60000; }
function applyData(data) {
  posts.value = data.posts; stats.value = data.stats; settings.value = data.wall;
  keywordsText.value = data.wall.blacklistedKeywords.join(', ');
  blacklistAuthorsText.value = data.wall.blacklistedAuthors.join(', ');
}
async function loadSocialWall() {
  if (!canEdit.value || busy.value) return;
  busy.value = true;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(currentEvent.value)}/posts`);
    if (response.status !== 200) throw new Error(response.message);
    applyData(response.data);
  } catch (failure) { error.value = failure.message || 'Could not load social wall.'; }
  finally { busy.value = false; }
}
async function change(payload) {
  if (!canEdit.value || busy.value) return;
  busy.value = true; error.value = ''; openMenuId.value = null;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(currentEvent.value)}/posts`, { method: 'POST', body: payload });
    if (response.status !== 200) {
      if (response.status === 409) {
        const fresh = await $fetch(`/api/wall/${encodeURIComponent(currentEvent.value)}/posts`);
        if (fresh.status === 200) applyData(fresh.data);
      }
      throw new Error(response.message);
    }
    applyData(response.data);
  } catch (failure) { error.value = failure.message || 'Could not update social wall.'; }
  finally { busy.value = false; }
}
function saveSettings() {
  const keys = ['enabled','publicUploadEnabled','moderationMode','windowMinutes','idleCycleSeconds','idleWaitSeconds'];
  const patch = Object.fromEntries(keys.map(key => [key,settings.value[key]]));
  patch.blacklistedKeywords = keywordsText.value.split(/[,\n]+/).map(term => term.trim()).filter(Boolean);
  patch.blacklistedAuthors = blacklistAuthorsText.value.split(/[,\n]+/).map(term => term.trim()).filter(Boolean);
  return change({ action: 'updateSettings', settings: patch, revision: settings.value.revision });
}
function applyPostAction(postId,action) { return change({ postId, action, revision: posts.value.find(post => post.id === postId)?.revision }); }
function confirmDelete(postId) {
  if (window.confirm('Delete this post and its uploaded media? A text record remains archived.')) applyPostAction(postId,'delete');
}
function toggleMenu(postId) { openMenuId.value = openMenuId.value === postId ? null : postId; }
function closeMenu(event) { if (event.key === 'Escape') openMenuId.value = null; }
watch(canEdit,loadSocialWall);
onMounted(() => { loadSocialWall(); document.addEventListener('keydown',closeMenu); });
onBeforeUnmount(() => document.removeEventListener('keydown',closeMenu));
useHead({ title: `${currentEvent.value} | Social Wall` });
</script>
