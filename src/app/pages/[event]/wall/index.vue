<template>
  <main
    class="public-wall relative h-dvh overflow-hidden bg-slate-100 text-slate-900 selection:bg-cyan-300 selection:text-slate-950 dark:bg-slate-950 dark:text-white"
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
      class="relative mx-auto flex h-full w-full max-w-[1800px] flex-col"
    >
      <PublicWallHeader
        :event-name="eventName"
        :wall-status="wallStatus"
        :uploads-enabled="uploadsEnabled"
        :show-sharing-qr="showQr && uploadsEnabled && wallStatus === 'available'"
        :upload-url="uploadUrl"
        :qr-url="qrUrl"
      />
      <PublicWallState
        v-if="wallStatus !== 'available' || !posts.length"
        :status="wallStatus"
        :event-name="eventName"
      />

      <section
        v-else
        ref="feedViewport"
        @pointerdown="pauseForInteraction"
        @wheel.passive="pauseForInteraction"
        class="relative min-h-0 flex-1 px-4"
        :class="isScrollingEnabled ? 'overflow-hidden' : 'overflow-y-auto mt-2'"
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
            :inert="copy > 1"
            :class="{ 'pointer-events-none': copy > 1 }"
            class="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4 pb-4"
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

      <PublicWallDisplayControls
        :scrolling-enabled="isScrollingEnabled"
        :fullscreen="isFullscreen"
        :dark-theme="isDarkTheme"
        :show-qr="showQr"
        :post-count="posts.length"
        @toggle-scroll="setScrollingEnabled"
        @toggle-fullscreen="toggleFullscreen"
        @toggle-theme="toggleTheme"
        @toggle-qr="showQr = $event"
      />
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
const showQr = ref(true);
const isFullscreen = ref(false);
const isScrollingEnabled = ref(true);
const feedViewport = ref(null);
const firstFeedCopy = ref(null);
const feedViewportHeight = ref(0);
const feedCopyHeight = ref(0);
const scrollOffset = ref(0);
const textPreviewLength = 100;
const cycleSeconds = ref(25), idleWaitSeconds = ref(30), uploadsEnabled = ref(false);
let pauseUntil = 0, loading = false;
function pauseForInteraction() { pauseUntil = performance.now() + idleWaitSeconds.value * 1000; }
let feedResizeObserver, qrMedia;
function updateQr() {
  qrUrl.value = qrMedia?.matches && showQr.value && uploadsEnabled.value && wallStatus.value === 'available' ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(uploadUrl.value)}` : '';
}

watch([showQr, uploadsEnabled, wallStatus, eventName], updateQr);

const feedCopyCount = computed(() => {
  if (!isScrollingEnabled.value) return 1;
  if (!feedCopyHeight.value) return 2;
  return Math.min(4, Math.max(2, Math.ceil(feedViewportHeight.value / feedCopyHeight.value) + 2));
});

const feedTrackStyle = computed(() => ({
  transform: isScrollingEnabled.value
    ? `translate3d(0, -${scrollOffset.value}px, 0)`
    : "none",
}));

const isDarkTheme = computed(() => colorMode.value === "dark");

const uploadUrl = computed(() => {
  if (!import.meta.client) return `/${encodeURIComponent(eventName.value)}/wall/upload`;
  return `${window.location.origin}/${encodeURIComponent(eventName.value)}/wall/upload`;
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
  if (loading) return;
  loading = true;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}`);
    if (response?.status !== 200 || !response.data?.wall) {
      wallStatus.value = "error";
      return;
    }

    wallStatus.value = response.data.wall.enabled === false ? "disabled" : "available";
    posts.value = response.data.posts || [];
    cycleSeconds.value = response.data.wall.idleCycleSeconds;
    idleWaitSeconds.value = response.data.wall.idleWaitSeconds;
    uploadsEnabled.value = response.data.wall.publicUploadEnabled;
  } catch (error) {
    console.warn("Wall load failed:", error);
    wallStatus.value = "error";
  } finally { loading = false; }
}

let refreshInterval, animationFrame = 0, previousFrame = 0;
function scrollFeed(timestamp) {
  if (timestamp >= pauseUntil && previousFrame && feedCopyHeight.value) {
    const elapsedSeconds = Math.min((timestamp - previousFrame) / 1000, 0.1);
    scrollOffset.value = (scrollOffset.value + Math.max(10, Math.min(80, feedCopyHeight.value / cycleSeconds.value)) * elapsedSeconds) % feedCopyHeight.value;
  }
  previousFrame = timestamp;
  animationFrame = requestAnimationFrame(scrollFeed);
}
function syncAnimation() {
  cancelAnimationFrame(animationFrame);
  previousFrame = 0;
  animationFrame = isScrollingEnabled.value && !document.hidden && posts.value.length ? requestAnimationFrame(scrollFeed) : 0;
}
function visibilityChanged() {
  syncAnimation();
  if (!document.hidden) loadWall();
}
watch([isScrollingEnabled, () => posts.value.length], () => { if (import.meta.client) syncAnimation(); });
onMounted(() => {
  if (window.matchMedia('(pointer: coarse), (max-width: 767px), (prefers-reduced-motion: reduce)').matches) isScrollingEnabled.value = false;
  qrMedia = window.matchMedia('(min-width: 1024px)');
  qrMedia.addEventListener('change', updateQr);
  updateQr();
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('visibilitychange', visibilityChanged);
  loadWall();
  refreshInterval = setInterval(() => { if (!document.hidden) loadWall(); }, 12000);
  feedResizeObserver = new ResizeObserver(measureFeed);
  if (feedViewport.value) feedResizeObserver.observe(feedViewport.value);
  if (firstFeedCopy.value) feedResizeObserver.observe(firstFeedCopy.value);
  measureFeed();
  syncAnimation();
});
onBeforeUnmount(() => {
  clearInterval(refreshInterval);
  qrMedia?.removeEventListener('change', updateQr);
  cancelAnimationFrame(animationFrame);
  feedResizeObserver?.disconnect();
  document.removeEventListener('fullscreenchange', syncFullscreenState);
  document.removeEventListener('visibilitychange', visibilityChanged);
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
      content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
    },
  ],
});
</script>
