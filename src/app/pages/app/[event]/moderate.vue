<template>
  <div class="space-y-6">
    <ModerationTabBar
      :active-tab="activeTab"
      :stats="stats"
      :tab-labels="tabLabel"
      @select="activeTab = $event"
    />

    <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <ModerationSettingsPanel
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
        <ModerationToolbar
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
          <ModerationPostCard
            v-for="post in filteredPosts"
            :key="post.id"
            :post="post"
            :menu-open="openMenuId === post.id"
            :expired="isOutsideWindow(post)"
            @moderate="moderatePost(post.id, $event)"
            @toggle-menu="toggleMenu(post.id)"
            @close-menu="openMenuId = null"
            @delete="confirmDelete(post.id)"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import ModerationTabBar from "../../../components/wall/ModerationTabBar.vue";
import ModerationSettingsPanel from "../../../components/wall/ModerationSettingsPanel.vue";
import ModerationPostCard from "../../../components/wall/ModerationPostCard.vue";
import ModerationToolbar from "../../../components/wall/ModerationToolbar.vue";

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
