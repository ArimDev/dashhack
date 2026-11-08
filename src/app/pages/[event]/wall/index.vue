<template>
  <main
    class="relative h-screen overflow-hidden bg-slate-100 text-slate-900 selection:bg-cyan-300 selection:text-slate-950 dark:bg-slate-950 dark:text-white"
  >
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        class="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
      />
      <div
        class="absolute -right-40 top-1/3 h-120 w-120 rounded-full bg-indigo-500/10 blur-3xl"
      />
    </div>

    <div
      class="relative mx-auto flex h-full w-full max-w-[1800px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8"
    >
      <PublicWallHeader
        :event-name="eventName"
        :wall-status="wallStatus"
        :scrolling-enabled="isScrollingEnabled"
        :fullscreen="isFullscreen"
        :dark-theme="isDarkTheme"
        @toggle-scroll="setScrollingEnabled"
        @toggle-fullscreen="toggleFullscreen"
        @toggle-theme="toggleTheme"
      />

      <PublicWallState
        v-if="wallStatus !== 'available' || !posts.length"
        :status="wallStatus"
        :event-name="eventName"
      />

      <section
        v-else
        ref="feedViewport"
        class="relative min-h-0 flex-1"
        :class="isScrollingEnabled ? 'overflow-hidden' : 'overflow-y-auto'"
      >
        <div
          :class="{ 'will-change-transform': isScrollingEnabled }"
          :style="feedTrackStyle"
        >
          <div
            v-for="copy in feedCopyCount"
            :key="copy"
            :ref="copy === 1 ? setFirstFeedCopy : undefined"
            :aria-hidden="copy > 1 ? 'true' : undefined"
            :class="{ 'pointer-events-none': copy > 1 }"
            class="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4"
          >
            <WallPostCard
              v-for="post in posts"
              :key="`${copy}-${post.id}`"
              :post="post"
              :text-preview-length="textPreviewLength"
            />
          </div>
        </div>
      </section>

      <a
        v-if="qrUrl && wallStatus === 'available'"
        :href="uploadUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="group absolute top-30 right-8 z-99 flex w-44 flex-col items-center gap-2 rounded-xl border border-cyan-300/40 bg-bluey-500/10 p-2.5 text-center shadow-xl shadow-slate-900/5 backdrop-blur-xl transition hover:border-cyan-300/70 hover:bg-bluey-500/15 dark:border-white/10 dark:bg-white/4 dark:shadow-black/20"
      >
        <img
          :src="qrUrl"
          alt="Scan to upload a post"
          class="h-18 w-18 shrink-0 rounded-lg bg-white p-1"
        />
        <span class="min-w-0">
          <span
            class="block text-sm font-bold leading-tight text-slate-900 dark:text-white"
            >Your moment belongs here!</span
          >
          <span
            class="mt-0.5 block text-xs leading-relaxed text-slate-600 dark:text-slate-300"
            >Scan to share a photo, video or story.</span
          >
        </span>
      </a>
      <footer
        v-if="wallStatus === 'available'"
        class="mt-3 flex shrink-0 items-center justify-between gap-3 px-1 text-xs text-slate-600 dark:text-slate-500"
      >
        <div
          class=""
        >
          <p >{{ posts.length }} shared moments</p>
        </div>
        <span class="inline-flex items-center gap-1.5"
          ><Icon name="heroicons:arrow-path" size="13px" /> Updates automatically</span
        >
      </footer>
    </div>
  </main>
</template>

<script setup>
import WallPostCard from "../../../components/wall/PostCard.vue";
import PublicWallHeader from "../../../components/wall/PublicWallHeader.vue";
import PublicWallState from "../../../components/wall/PublicWallState.vue";

const route = useRoute();
const colorMode = useColorMode();
const eventName = computed(() => route.params.event || "event");
const posts = ref([]);
const wallStatus = ref("loading");
const qrUrl = ref("");
const isFullscreen = ref(false);
const isScrollingEnabled = ref(true);
const feedViewport = ref(null);
const firstFeedCopy = ref(null);
const feedViewportHeight = ref(0);
const feedCopyHeight = ref(0);
const scrollOffset = ref(0);
const textPreviewLength = 100;
const scrollSpeed = 18;
let feedResizeObserver;

const feedCopyCount = computed(() => {
  if (!isScrollingEnabled.value) return 1;
  if (!feedCopyHeight.value) return 2;
  return Math.max(2, Math.ceil(feedViewportHeight.value / feedCopyHeight.value) + 2);
});

const feedTrackStyle = computed(() => ({
  transform: isScrollingEnabled.value
    ? `translate3d(0, -${scrollOffset.value}px, 0)`
    : "none",
}));

const isDarkTheme = computed(() => colorMode.value === "dark");

const uploadUrl = computed(() => {
  if (!import.meta.client) return `/${eventName.value}/wall/upload`;
  return `${window.location.origin}/${eventName.value}/wall/upload`;
});

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn("Could not toggle full screen:", error);
  }
}

function syncFullscreenState() {
  isFullscreen.value = Boolean(document.fullscreenElement);
}

function toggleTheme() {
  colorMode.preference = isDarkTheme.value ? "light" : "dark";
}

function resetFeedPosition() {
  scrollOffset.value = 0;
  if (feedViewport.value) feedViewport.value.scrollTop = 0;
}

function setScrollingEnabled(enabled) {
  isScrollingEnabled.value = enabled;
  resetFeedPosition();
}

function setFirstFeedCopy(element) {
  firstFeedCopy.value = element;
}

function measureFeed() {
  feedViewportHeight.value = feedViewport.value?.clientHeight || 0;
  feedCopyHeight.value = firstFeedCopy.value?.getBoundingClientRect().height || 0;
  if (feedCopyHeight.value && scrollOffset.value >= feedCopyHeight.value) {
    scrollOffset.value %= feedCopyHeight.value;
  }
}

async function loadWall() {
  try {
    const response = await $fetch(`/api/wall/${eventName.value}`);
    if (response?.status !== 200 || !response.data?.wall) {
      wallStatus.value = "error";
      return;
    }

    wallStatus.value = response.data.wall.enabled === false ? "disabled" : "available";
    posts.value = response.data.posts || [];
  } catch (error) {
    console.warn("Wall load failed:", error);
    wallStatus.value = "error";
  }
}

onMounted(() => {
  qrUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    uploadUrl.value
  )}`;
  document.addEventListener("fullscreenchange", syncFullscreenState);
  loadWall();

  const refreshInterval = setInterval(loadWall, 12000);
  let animationFrame = 0;
  let previousFrame = 0;
  feedResizeObserver = new ResizeObserver(measureFeed);
  if (feedViewport.value) feedResizeObserver.observe(feedViewport.value);
  if (firstFeedCopy.value) feedResizeObserver.observe(firstFeedCopy.value);
  measureFeed();

  const scrollFeed = (timestamp) => {
    if (isScrollingEnabled.value && previousFrame && feedCopyHeight.value) {
      const elapsedSeconds = Math.min((timestamp - previousFrame) / 1000, 0.1);
      scrollOffset.value =
        (scrollOffset.value + scrollSpeed * elapsedSeconds) % feedCopyHeight.value;
    }
    previousFrame = timestamp;
    animationFrame = requestAnimationFrame(scrollFeed);
  };
  animationFrame = requestAnimationFrame(scrollFeed);

  onBeforeUnmount(() => {
    clearInterval(refreshInterval);
    cancelAnimationFrame(animationFrame);
    feedResizeObserver?.disconnect();
    document.removeEventListener("fullscreenchange", syncFullscreenState);
  });
});

watch(
  [posts, feedViewport, firstFeedCopy],
  async () => {
    await nextTick();
    measureFeed();
    if (feedViewport.value) feedResizeObserver?.observe(feedViewport.value);
    if (firstFeedCopy.value) feedResizeObserver?.observe(firstFeedCopy.value);
  },
  { flush: "post" }
);

useHead({
  title: `${eventName.value} | Wall`,
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
  ],
});
</script>
