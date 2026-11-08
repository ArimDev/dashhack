<template>
  <div class="space-y-6">
    <div
      class="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm scrollbar-hide dark:border-slate-700 dark:bg-slate-900"
    >
      <button
        v-for="tab in [
          {
            id: 'all',
            label: 'All',
            count: stats.total,
            active: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white',
          },
          {
            id: 'approved',
            label: 'Approved',
            count: stats.approved,
            active:
              'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
          },
          {
            id: 'pending',
            label: 'Pending',
            count: stats.pending,
            active:
              'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
          },
          {
            id: 'rejected',
            label: 'Rejected',
            count: stats.rejected,
            active: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
          },
          {
            id: 'pinned',
            label: 'Pinned',
            count: stats.pinned,
            active: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
          },
        ]"
        :key="tab.id"
        type="button"
        @click="activeTab = tab.id"
        :aria-pressed="activeTab === tab.id"
        :class="
          activeTab === tab.id
            ? tab.active
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        "
        class="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span>{{ tab.label }}</span>
        <span
          class="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold tabular-nums dark:bg-white/10"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
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
              v-model="settings.moderationMode"
              class="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              @change="saveSettings"
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
              v-model="settings.enabled"
              type="checkbox"
              @change="saveSettings"
              class="h-5 w-5"
            />
          </label>

          <label
            class="flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300"
          >
            <span>Public upload</span>
            <input
              v-model="settings.publicUploadEnabled"
              type="checkbox"
              @change="saveSettings"
              class="h-5 w-5"
            />
          </label>

          <label class="block text-sm text-slate-600 dark:text-slate-300">
            Time window (minutes)
            <input
              v-model.number="settings.windowMinutes"
              type="number"
              min="15"
              step="5"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              @change="saveSettings"
            />
          </label>

          <label class="block text-sm text-slate-600 dark:text-slate-300">
            Idle rotation (seconds)
            <input
              v-model.number="settings.idleCycleSeconds"
              type="number"
              min="5"
              step="5"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              @change="saveSettings"
            />
          </label>

          <label class="block text-sm text-slate-600 dark:text-slate-300">
            Filtered keywords
            <textarea
              v-model="keywordsText"
              rows="3"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              @change="saveSettings"
            />
          </label>

          <label class="block text-sm text-slate-600 dark:text-slate-300">
            Blacklisted authors
            <textarea
              v-model="blacklistAuthorsText"
              rows="2"
              class="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              @change="saveSettings"
            />
          </label>

          <div
            class="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200"
          >
            QR upload: <code class="break-all">{{ uploadQrUrl }}</code>
          </div>
        </div>
      </aside>

      <section class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-black">Posts · {{ tabLabel[activeTab] }}</h2>
          <div class="flex items-center gap-2">
            <div
              class="inline-flex items-center rounded-full border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
            >
              <button
                type="button"
                @click="sortOrder = 'newest'"
                :class="
                  sortOrder === 'newest'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                "
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              >
                Newest first
              </button>
              <button
                type="button"
                @click="sortOrder = 'oldest'"
                :class="
                  sortOrder === 'oldest'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                "
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              >
                Oldest first
              </button>
            </div>
            <a
              :href="`/${currentEvent}/wall`"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full bg-bluey-500 px-4 py-2 text-sm font-bold text-white hover:bg-bluey-600"
            >
              Open wall
            </a>
          </div>
        </div>

        <div
          v-if="!filteredPosts.length"
          class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          No {{ tabLabel[activeTab].toLowerCase() }} posts.
        </div>

        <div v-else class="grid gap-4">
          <article
            v-for="post in filteredPosts"
            :key="post.id"
            class="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div
              class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
            >
              <div class="relative min-w-0 flex-1 overflow-hidden rounded-2xl">
                <div class="mb-2 flex items-center gap-2">
                  <Badge variant="slate" size="xs" upper>{{ post.platform }}</Badge>
                  <span
                    class="text-sm font-semibold text-slate-800 dark:text-slate-100"
                    >{{ post.authorName || "Anonymous" }}</span
                  >
                  <span v-if="post.handle" class="text-xs text-slate-500">{{
                    post.handle
                  }}</span>
                  <Badge v-if="post.pinned" variant="cyan" upper>
                    <Icon name="heroicons:map-pin" size="12px" />
                    Pinned
                  </Badge>
                </div>
                <p
                  class="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                >
                  {{ post.text }}
                </p>
                <div
                  v-if="post.imageUrl"
                  class="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <img :src="post.imageUrl" class="max-h-60 w-full object-cover" />
                </div>
                <div
                  v-if="post.videoUrl"
                  class="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <video :src="post.videoUrl" controls class="max-h-60 w-full bg-black" />
                </div>

                <!-- Hidden overlay: blurs only the post content, not the actions -->
                <div
                  v-if="post.hidden"
                  class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/40 backdrop-blur-sm"
                >
                  <div class="flex flex-col items-center gap-2">
                    <Icon
                      :name="
                        post.status === 'rejected'
                          ? 'heroicons:x-circle'
                          : 'heroicons:eye-slash'
                      "
                      size="32px"
                      class="text-white/90"
                    />
                    <span class="text-xs font-semibold text-white/90">{{
                      post.status === "rejected" ? "Rejected" : "Hidden from wall"
                    }}</span>
                  </div>
                </div>
              </div>

              <div class="relative z-10 flex flex-col gap-3 md:items-end md:gap-2">
                <!-- Pending posts: Approve/Reject -->
                <div
                  v-if="post.status === 'pending'"
                  class="flex flex-wrap items-center gap-2"
                >
                  <button
                    @click="moderatePost(post.id, 'approve')"
                    class="rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600 active:scale-95"
                  >
                    ✓ Approve
                  </button>
                  <button
                    @click="moderatePost(post.id, 'reject')"
                    class="rounded-full bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 active:scale-95"
                  >
                    ✕ Reject
                  </button>
                </div>

                <!-- Approved posts: Dropdown menu -->
                <div
                  v-else-if="post.status === 'approved'"
                  class="flex items-center gap-2"
                >
                  <Badge
                    v-if="!post.pinned && isOutsideWindow(post)"
                    variant="amber"
                    size="md"
                    upper
                    title="Older than the wall's time window — won't appear on the live wall unless pinned"
                  >
                    <Icon name="heroicons:clock" size="12px" />
                    Expired
                  </Badge>
                  <div class="relative">
                    <button
                      @click="toggleMenu(post.id)"
                      class="rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                    >
                      <Icon name="heroicons:ellipsis-horizontal" size="18px" />
                    </button>

                    <div
                      v-if="openMenuId === post.id"
                      class="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    >
                      <button
                        @click="
                          moderatePost(post.id, post.hidden ? 'unhide' : 'hide');
                          openMenuId = null;
                        "
                        class="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Icon
                          :name="post.hidden ? 'heroicons:eye' : 'heroicons:eye-slash'"
                          size="16px"
                        />
                        {{ post.hidden ? "Unhide" : "Hide" }}
                      </button>
                      <button
                        @click="
                          moderatePost(post.id, post.pinned ? 'unpin' : 'pin');
                          openMenuId = null;
                        "
                        class="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Icon
                          :name="post.pinned ? 'heroicons:map-pin' : 'heroicons:map-pin'"
                          size="16px"
                          :class="{ 'opacity-40': !post.pinned }"
                        />
                        {{ post.pinned ? "Unpin" : "Pin" }}
                      </button>
                      <button
                        v-if="post.hidden"
                        @click="confirmDelete(post.id)"
                        class="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Icon name="heroicons:trash" size="16px" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Rejected posts: menu -->
                <div v-else-if="post.status === 'rejected'" class="relative">
                  <button
                    @click="toggleMenu(post.id)"
                    class="rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                  >
                    <Icon name="heroicons:ellipsis-horizontal" size="18px" />
                  </button>

                  <div
                    v-if="openMenuId === post.id"
                    class="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    <button
                      @click="
                        moderatePost(post.id, 'unreject');
                        openMenuId = null;
                      "
                      class="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Icon name="heroicons:arrow-uturn-left" size="16px" />
                      Undo
                    </button>
                    <button
                      @click="confirmDelete(post.id)"
                      class="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Icon name="heroicons:trash" size="16px" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <!-- Close menu when clicking outside -->
              <div v-if="openMenuId" @click="openMenuId = null" class="fixed inset-0" />
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import Badge from "../../../components/ui/Badge.vue";

definePageMeta({
  layout: "dashboard",
  middleware: ["routes"],
});

const currentEvent = useState("currentEvent");
const eventData = useState("eventData");
const posts = ref([]);
const stats = ref({
  total: 0,
  approved: 0,
  pending: 0,
  hidden: 0,
  rejected: 0,
  pinned: 0,
});
const openMenuId = ref(null);
const activeTab = ref("all");
const sortOrder = ref("newest");
const settings = ref({
  enabled: true,
  publicUploadEnabled: true,
  moderationMode: "auto",
  windowMinutes: 1440,
  idleCycleSeconds: 25,
  idleWaitSeconds: 30,
});
const keywordsText = ref("");
const blacklistAuthorsText = ref("");

const uploadQrUrl = computed(() => {
  if (!import.meta.client || !currentEvent.value) return "";
  const protocol = window.location.protocol || "http:";
  const host = window.location.host || "localhost";
  return `${protocol}//${host}/${currentEvent.value}/wall/upload`;
});

const tabLabel = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  pinned: "Pinned",
};

const filteredPosts = computed(() => {
  let list = [];

  if (activeTab.value === "all") list = posts.value;
  else if (activeTab.value === "pending")
    list = posts.value.filter((post) => post.status === "pending");
  else if (activeTab.value === "approved")
    list = posts.value.filter((post) => post.status === "approved");
  else if (activeTab.value === "rejected")
    list = posts.value.filter((post) => post.status === "rejected");
  else if (activeTab.value === "pinned") list = posts.value.filter((post) => post.pinned);
  else list = posts.value;

  return [...list].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return sortOrder.value === "oldest" ? aTime - bTime : bTime - aTime;
  });
});

function isOutsideWindow(post) {
  const windowMs = Number(settings.value.windowMinutes || 1440) * 60 * 1000;
  const createdAt = new Date(post.createdAt || Date.now()).getTime();
  return Date.now() - createdAt > windowMs;
}

watch(
  () => eventData.value,
  (value) => {
    if (!value) return;
    const wall = value.wall || {};
    settings.value = {
      enabled: wall.enabled ?? true,
      publicUploadEnabled: wall.publicUploadEnabled ?? true,
      moderationMode: wall.moderationMode || "auto",
      windowMinutes: wall.windowMinutes || 1440,
      idleCycleSeconds: wall.idleCycleSeconds || 25,
      idleWaitSeconds: wall.idleWaitSeconds || 30,
    };
    keywordsText.value = (wall.blacklistedKeywords || []).join(", ");
    blacklistAuthorsText.value = (wall.blacklistedAuthors || []).join(", ");
    posts.value = (value.posts || [])
      .map((post) => ({
        ...post,
        createdAt: post.createdAt || new Date().toISOString(),
      }))
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },
  { immediate: true }
);

async function loadModeration() {
  try {
    const response = await $fetch(`/api/wall/${currentEvent.value}/moderate`);
    if (!response || !response.data) return;
    posts.value = response.data.posts || [];
    stats.value = response.data.stats || stats.value;
    settings.value = {
      enabled: response.data.wall.enabled ?? true,
      publicUploadEnabled: response.data.wall.publicUploadEnabled ?? true,
      moderationMode: response.data.wall.moderationMode || "auto",
      windowMinutes: response.data.wall.windowMinutes || 1440,
      idleCycleSeconds: response.data.wall.idleCycleSeconds || 25,
      idleWaitSeconds: response.data.wall.idleWaitSeconds || 30,
    };
    keywordsText.value = (response.data.wall.blacklistedKeywords || []).join(", ");
    blacklistAuthorsText.value = (response.data.wall.blacklistedAuthors || []).join(", ");
  } catch (error) {
    console.warn("Failed to load moderation dashboard:", error);
  }
}

async function saveSettings() {
  const payload = {
    action: "updateSettings",
    settings: {
      ...settings.value,
      blacklistedKeywords: keywordsText.value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      blacklistedAuthors: blacklistAuthorsText.value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    },
  };

  await $fetch(`/api/wall/${currentEvent.value}/moderate`, {
    method: "POST",
    body: payload,
  });
  await loadModeration();
}

async function moderatePost(postId, action) {
  await $fetch(`/api/wall/${currentEvent.value}/moderate`, {
    method: "POST",
    body: { action, postId },
  });
  await loadModeration();
}

function confirmDelete(postId) {
  openMenuId.value = null;
  if (
    window.confirm(
      "Delete this post permanently from the wall and moderation list? It will remain archived in the database."
    )
  ) {
    moderatePost(postId, "delete");
  }
}

function toggleMenu(postId) {
  openMenuId.value = openMenuId.value === postId ? null : postId;
}

onMounted(async () => {
  await loadModeration();
  // Close menu when pressing Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openMenuId.value = null;
  });
});
</script>
