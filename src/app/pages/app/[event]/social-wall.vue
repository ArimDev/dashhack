<template>
  <div class="space-y-6">
    <p v-if="!canEdit" role="status">Log in to this event to moderate its social wall.</p>
    <p v-if="error" role="alert" class="text-red-600 dark:text-red-400">{{ error }}</p>
    <fieldset v-if="canEdit" :disabled="busy" class="space-y-6 min-w-0">
    <button class="rounded-lg border px-3 py-2" @click="loadSocialWall">Refresh posts</button>
    <p v-if="storage" class="rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-600" data-testid="wall-storage-usage">
      Upload storage: {{ mib(storage.eventBytes) }} / {{ mib(storage.eventLimit) }} MiB for this event;
      {{ mib(storage.totalBytes) }} / {{ mib(storage.totalLimit) }} MiB across all walls.
      Volume free: {{ mib(storage.availableBytes) }} MiB ({{ mib(storage.reserveBytes) }} MiB reserved).
      Pending and rejected attachments count too. Deleting their posts frees upload capacity.
    </p>
    <WallModerationTabBar
      :active-tab="activeTab"
      :stats="stats"
      :tab-labels="tabLabel"
      @select="activeTab = $event"
    />

    <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div class="min-w-0">
        <button type="button" @click="wallSettingsOpen = !wallSettingsOpen" :aria-expanded="wallSettingsOpen" class="mb-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800 xl:hidden">
          Wall settings and upload link <Icon :name="wallSettingsOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" size="18px" />
        </button>
        <div :class="wallSettingsOpen ? 'block' : 'hidden xl:block'">
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
        </div>
      </div>

      <section class="space-y-4">
        <WallModerationToolbar
          :active-tab-label="tabLabel[activeTab]"
          :current-event="currentEvent"
          :sort-order="sortOrder"
          @sort="sortOrder = $event"
        />

        <div class="flex flex-wrap items-end gap-3">
          <label class="min-w-0 flex-1 text-sm">Search posts
            <input v-model="search" type="search" maxlength="200" placeholder="Text, author or @handle" class="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <label class="text-sm">Per page
            <select aria-label="Per page" v-model.number="perPage" class="mt-1 block min-h-11 rounded-xl border bg-white px-3 dark:border-slate-600 dark:bg-slate-900"><option :value="10">10</option><option :value="20">20</option><option :value="50">50</option></select>
          </label>
        </div>
        <nav aria-label="Post pages" class="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>{{ pagination.totalMatched }} posts · {{ page }} / {{ pagination.pageCount }}</span>
          <div class="flex gap-2">
            <button type="button" :disabled="page <= 1 || fetching" @click="page--" class="min-h-11 rounded-xl border px-3 disabled:opacity-40">Previous page</button>
            <button type="button" :disabled="page >= pagination.pageCount || fetching" @click="page++" class="min-h-11 rounded-xl border px-3 disabled:opacity-40">Next page</button>
          </div>
        </nav>
        <div
          v-if="!posts.length && !fetching"
          class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          No matching posts.
        </div>

        <div v-else class="grid gap-4">
          <WallModerationPostCard
            v-for="post in posts"
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
const wallSettingsOpen = ref(false);
const canEdit = useState('eventCanEdit');
const storage = ref(null);
function mib(bytes) { return (bytes / 1024 / 1024).toFixed(1); }
const posts = ref([]), stats = ref({}), settings = ref({});
const keywordsText = ref(''), blacklistAuthorsText = ref('');
const openMenuId = ref(null), activeTab = ref('all'), sortOrder = ref('newest');
const search=ref(''),perPage=ref(20),page=ref(1),pagination=ref({pageCount:1,totalMatched:0}),fetching=ref(false);
let searchTimer,readController,syncingPage=false;
const busy = ref(false), error = ref('');
const uploadQrUrl = computed(() => import.meta.client ? `${window.location.origin}/${encodeURIComponent(currentEvent.value)}/wall/upload` : '');
const tabLabel = { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', pinned: 'Pinned' };
const view=()=>({page:page.value,perPage:perPage.value,search:search.value,status:activeTab.value,sort:sortOrder.value});
function isOutsideWindow(post) { return Date.now()-Date.parse(post.createdAt) > (settings.value.windowMinutes || 1440)*60000; }
function applyData(data) {
  if(data.pagination){pagination.value=data.pagination;syncingPage=true;page.value=data.pagination.page;syncingPage=false;}
  storage.value = data.storage;
  posts.value = data.posts; stats.value = data.stats; settings.value = data.wall;
  keywordsText.value = data.wall.blacklistedKeywords.join(', ');
  blacklistAuthorsText.value = data.wall.blacklistedAuthors.join(', ');
}
async function loadSocialWall() {
  if(!canEdit.value || busy.value) return;
  readController?.abort();const controller=readController=new AbortController();fetching.value=true;error.value='';
  try {
    const response=await $fetch(`/api/wall/${encodeURIComponent(currentEvent.value)}/posts`,{query:view(),signal:controller.signal});
    if(controller!==readController || controller.signal.aborted) return;
    if(response.status!==200) throw new Error(response.message);applyData(response.data);
  }catch(failure){if(!controller.signal.aborted)error.value=failure.message || 'Could not load posts.';}
  finally{if(controller===readController)fetching.value=false;}
}
function queueLoad(){clearTimeout(searchTimer);searchTimer=setTimeout(loadSocialWall,250);}
watch([search,activeTab,sortOrder,perPage],()=>{syncingPage=true;page.value=1;syncingPage=false;openMenuId.value=null;queueLoad();},{flush:'sync'});
watch(page,()=>{if(!syncingPage){openMenuId.value=null;queueLoad();}},{flush:'sync'});
async function change(payload) {
  if (!canEdit.value || busy.value) return;
  readController?.abort();clearTimeout(searchTimer);busy.value = true; error.value = ''; openMenuId.value = null;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(currentEvent.value)}/posts`, { method: 'POST', body: { ...payload, view: view() } });
    if (response.status !== 200) {
      if (response.status === 409) {
        const fresh = await $fetch(`/api/wall/${encodeURIComponent(currentEvent.value)}/posts`, { query: view() });
        if (fresh.status === 200) applyData(fresh.data);
      }
      throw new Error(response.message);
    }
    applyData(response.data);
  } catch (failure) { error.value = failure.message || 'Could not update social wall.'; }
  finally { busy.value = false; }
}
function saveSettings() {
  const keys = ['title','scrollSpeed','enabled','publicUploadEnabled','moderationMode','windowMinutes','idleCycleSeconds','idleWaitSeconds'];
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
onBeforeUnmount(() => {clearTimeout(searchTimer);readController?.abort();document.removeEventListener('keydown',closeMenu);});
useHead({ title: `${currentEvent.value} | Social Wall` });
</script>
