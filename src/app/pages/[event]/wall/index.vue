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
        :event-name="displayTitle"
        :wall-status="wallStatus"
        :uploads-enabled="uploadsEnabled"
        :show-sharing-qr="showQr && uploadsEnabled && wallStatus === 'available'"
        :upload-url="uploadUrl"
        :qr-url="qrUrl"
      />
      <PublicWallState
        v-if="wallStatus !== 'available' || !posts.length"
        :status="wallStatus"
        :event-name="displayTitle"
      />

      <section
        v-else
        ref="feedViewport"
        data-wall-viewport
        @pointerdown="pauseForInteraction"
        @pointermove="pauseForInteraction"
        @pointerleave="pauseForInteraction"
        @focusin="pauseForInteraction"
        @wheel.passive="pauseForInteraction"
        class="relative min-h-0 flex-1 pb-4 pl-16 pr-4 pt-4 sm:pl-24"
        :class="isScrollingEnabled ? 'overflow-hidden' : 'overflow-y-auto mt-2'"
      >
        <div
          data-testid="wall-feed-track"
          :class="{ 'will-change-transform': isScrollingEnabled }"
          :style="feedTrackStyle"
        >
          <div
            v-for="copy in feedCopyCount"
            :key="copy"
            :ref="copy === 1 ? setFirstFeedCopy : undefined"
            :aria-hidden="copy > 1 ? 'true' : undefined"
            :data-wall-copy="copy"
            class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-4"
          >
            <div v-for="(column, columnIndex) in postColumns" :key="columnIndex" class="min-w-0">
              <WallPostCard
                v-for="post in column"
                :key="`${copy}-${post.id}`"
                :post="post"
                :decorative="copy > 1"
                @read="openPost"
                :text-preview-length="textPreviewLength"
              />
            </div>
          </div>
        </div>
      </section>

      <PublicWallDisplayControls
        v-if="canEdit"
        :scrolling-enabled="isScrollingEnabled"
        :fullscreen="isFullscreen"
        :dark-theme="isDarkTheme"
        :show-qr="showQr"
        :qr-available="uploadsEnabled && wallStatus === 'available'"
        :post-count="totalPosts"
        :scroll-speed="scrollSpeed"
        :speed-saving="speedSaving"
        :speed-error="speedError"
        @set-speed="saveSpeed"
        @toggle-scroll="setScrollingEnabled"
        @toggle-fullscreen="toggleFullscreen"
        @toggle-theme="toggleTheme"
        @toggle-qr="showQr = $event"
        @open-qr="qrExpanded = true"
      />
    </div>
    <DialogShell v-if="qrExpanded" title="Share a moment" fullscreen @close="closeQr">
      <div class="flex max-w-full flex-col items-center gap-4 text-center">
        <p class="text-xl font-bold">{{ displayTitle }}</p>
        <img v-if="qrUrl" :src="qrUrl" alt="Scan to upload a post" width="640" height="640" class="aspect-square h-[min(70vmin,calc(100dvh-14rem),640px)] w-auto max-w-full rounded-2xl bg-white p-4" />
        <a :href="uploadUrl" target="_blank" rel="noopener noreferrer" class="min-h-11 text-bluey-600 underline dark:text-bluey-300">Share a moment</a>
      </div>
    </DialogShell>
    <DialogShell v-if="readingPost" title="Full post" @close="closePost">
      <WallPostCard :post="readingPost" full-text />
    </DialogShell>
  </main>
</template>

<script setup>
import WallPostCard from "../../../components/wall/PostCard.vue";
import PublicWallHeader from "../../../components/wall/PublicWallHeader.vue";
import PublicWallState from "../../../components/wall/PublicWallState.vue";

const route = useRoute();
const colorMode = useColorMode();
const eventName = computed(() => route.params.event || "event");
const posts = ref([]), renderedCount = ref(12), totalPosts = ref(0);
const renderedPosts = computed(() => posts.value.slice(0, renderedCount.value));
const columnCount = ref(1);
const postColumns = computed(() => {
  const columns = Array.from({ length: columnCount.value }, () => []);
  renderedPosts.value.forEach((post, index) => columns[index % columns.length].push(post));
  return columns;
});
function updateColumnCount() { columnCount.value = innerWidth >= 1536 ? 4 : innerWidth >= 1280 ? 3 : innerWidth >= 640 ? 2 : 1; }
const readingPost = ref(null), qrExpanded=ref(false), wallTitle=ref('');
const displayTitle=computed(()=>wallTitle.value || eventName.value);
function closeQr(){readerResumeUntil=performance.now()+idleWaitSeconds.value*1000;pauseUntil=readerResumeUntil;qrExpanded.value=false;nextTick(()=>document.querySelector('[aria-label="Wall display settings"]')?.focus());}
function openPost(post) {
  pauseForInteraction();
  // Loop copies support pointer input, but focus returns to the one accessible card.
  feedViewport.value?.querySelector(`[data-wall-copy="1"] [data-wall-post-id="${CSS.escape(post.id)}"] [data-read-post]`)?.focus({ preventScroll: true });
  readingPost.value = post;
}
function closePost() {
  // Ignore focus restoration and pointer re-entry while the reader's close delay runs.
  readerResumeUntil = performance.now() + idleWaitSeconds.value * 1000;
  pauseUntil = readerResumeUntil;
  readingPost.value = null;
}
const canEdit = ref(false);
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
const scrollSpeed = ref(40), speedSaving = ref(false), speedError = ref(''), wallRevision = ref(0);
const idleWaitSeconds = ref(5), uploadsEnabled = ref(false);
let pauseUntil = 0, readerResumeUntil = 0, loading = false;
function pauseForInteraction(event) {
  const now = performance.now();
  if (now < readerResumeUntil && ['focusin','pointerenter','pointermove'].includes(event?.type)) return;
  pauseUntil = now + idleWaitSeconds.value * 1000;
}
let feedResizeObserver, qrMedia;
function updateQr() {
  qrUrl.value = ((qrMedia?.matches && showQr.value) || qrExpanded.value) && uploadsEnabled.value && wallStatus.value === 'available' ? `https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encodeURIComponent(uploadUrl.value)}` : '';
}

watch([showQr, qrExpanded, uploadsEnabled, wallStatus, eventName], updateQr);

const feedCopyCount = computed(() => {
  if (!isScrollingEnabled.value) return 1;
  if (!feedCopyHeight.value) return 2;
  return Math.min(4, Math.max(2, Math.ceil(feedViewportHeight.value / feedCopyHeight.value) + 1));
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

let disposed = false, loadController, revealHandle = 0, revealUsesIdle = false;
function revealMore() {
  if (revealHandle || disposed || document.hidden || renderedCount.value >= posts.value.length) return;
  const reveal = () => {
    revealHandle = 0;
    if (disposed || document.hidden) return;
    renderedCount.value = Math.min(posts.value.length, renderedCount.value + 12);
    revealMore();
  };
  revealUsesIdle = typeof window.requestIdleCallback === 'function';
  revealHandle = revealUsesIdle ? window.requestIdleCallback(reveal, { timeout: 200 }) : window.setTimeout(reveal, 32);
}
function applySettings(wall) {
  const revision = wall.revision || 0;
  if (revision < wallRevision.value) return;
  wallRevision.value = revision;
  if (!speedSaving.value) scrollSpeed.value = wall.scrollSpeed || 40;
  idleWaitSeconds.value = wall.idleWaitSeconds;
  uploadsEnabled.value = wall.publicUploadEnabled;
  wallTitle.value=wall.title || '';
}
function applyPosts(incoming) {
  const previous = new Map(posts.value.map(post => [post.id, post]));
  // Keep unchanged card props stable during the 12-second refresh.
  posts.value = [...new Map(incoming.map(post => [post.id, previous.has(post.id) && JSON.stringify(previous.get(post.id)) === JSON.stringify(post) ? previous.get(post.id) : post])).values()];
  revealMore();
}
async function saveSpeed(speed) {
  if (!canEdit.value || speedSaving.value) return;
  const previous = scrollSpeed.value;
  speedSaving.value = true; speedError.value = ''; scrollSpeed.value = speed;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}/posts`, {
      method: 'POST', body: { action: 'setSpeed', speed, revision: wallRevision.value }, timeout: 10000,
    });
    if (response.status !== 200) throw new Error(response.message || 'Could not save scroll speed.');
    wallRevision.value = response.data.wall.revision;
    scrollSpeed.value = response.data.wall.scrollSpeed;
  } catch (failure) {
    scrollSpeed.value = previous; speedError.value = failure.message || 'Could not save scroll speed.';
  } finally { speedSaving.value = false; }
}
async function loadWall() {
  if (loading || disposed) return;
  loading = true;
  loadController = new AbortController();
  const initial = !posts.value.length;
  try {
    const response = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}`, {
      ...(initial ? { query: { limit: 12 } } : {}), timeout: 8000, signal: loadController.signal,
    });
    if (disposed) return;
    if (response?.status !== 200 || !response.data?.wall) throw new Error('Wall unavailable');
    canEdit.value = response.canEdit === true;
    wallStatus.value = response.data.wall.enabled === false ? 'disabled' : 'available';
    totalPosts.value = response.data.total ?? response.data.posts?.length ?? 0;
    applySettings(response.data.wall);
    if (initial) renderedCount.value = 12;
    applyPosts(response.data.posts || []);
    if (initial && response.data.hasMore) {
      // Show and animate the first screen before fetching/building the rest of the loop.
      await nextTick();
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (disposed) return;
      const offset = response.data.posts.length;
      const rest = await $fetch(`/api/wall/${encodeURIComponent(eventName.value)}`, {
        query: { offset, limit: 200 - offset }, timeout: 8000, signal: loadController.signal,
      });
      if (disposed || rest?.status !== 200 || !rest.data?.wall) return;
      canEdit.value = rest.canEdit === true;
      wallStatus.value = rest.data.wall.enabled === false ? 'disabled' : 'available';
      applySettings(rest.data.wall);
      totalPosts.value = rest.data.total ?? totalPosts.value;
      applyPosts(rest.data.wall.enabled === false ? [] : [...response.data.posts, ...(rest.data.posts || [])]);
    }
  } catch (error) {
    if (!disposed && !posts.value.length) { canEdit.value = false; wallStatus.value = 'error'; }
    // A failed background refresh must not replace a running wall with a loading/error screen.
  } finally { loading = false; }
}

let refreshInterval, animationFrame = 0, previousFrame = 0;
function scrollFeed(timestamp) {
  if (timestamp >= pauseUntil && previousFrame && feedCopyHeight.value) {
    const elapsedSeconds = Math.min((timestamp - previousFrame) / 1000, 0.1);
    scrollOffset.value = (scrollOffset.value + scrollSpeed.value * elapsedSeconds) % feedCopyHeight.value;
  }
  previousFrame = timestamp;
  animationFrame = requestAnimationFrame(scrollFeed);
}
function syncAnimation() {
  cancelAnimationFrame(animationFrame);
  previousFrame = 0;
  animationFrame = isScrollingEnabled.value && !readingPost.value && !qrExpanded.value && !document.hidden && posts.value.length ? requestAnimationFrame(scrollFeed) : 0;
}
function visibilityChanged() {
  syncAnimation();
  if (!document.hidden) { revealMore(); loadWall(); }
}
watch([isScrollingEnabled, () => posts.value.length, readingPost, qrExpanded], () => { if (import.meta.client) syncAnimation(); });
onMounted(() => {
  updateColumnCount();
  window.addEventListener('resize', updateColumnCount, { passive: true });
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
  disposed = true;
  loadController?.abort();
  if (revealHandle) { if (revealUsesIdle) window.cancelIdleCallback(revealHandle); else clearTimeout(revealHandle); }
  clearInterval(refreshInterval);
  qrMedia?.removeEventListener('change', updateQr);
  cancelAnimationFrame(animationFrame);
  feedResizeObserver?.disconnect();
  window.removeEventListener('resize', updateColumnCount);
  document.removeEventListener('fullscreenchange', syncFullscreenState);
  document.removeEventListener('visibilitychange', visibilityChanged);
});

watch(
  [renderedPosts, feedViewport, firstFeedCopy],
  async () => {
    await nextTick();
    measureFeed();
    if (feedViewport.value) feedResizeObserver?.observe(feedViewport.value);
    if (firstFeedCopy.value) feedResizeObserver?.observe(firstFeedCopy.value);
  },
  { flush: "post" }
);

useHead(() => ({
  title: `${displayTitle.value} | Wall`,
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
    },
  ],
}));
</script>
