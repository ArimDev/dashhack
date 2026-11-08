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
      <header
        class="mb-3 h-20 rounded-2xl border border-cyan-300/40 bg-bluey-500/10 px-3 py-2.5 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:px-4 sm:py-3 dark:border-white/10 dark:bg-white/4 dark:shadow-black/20"
      >
        <div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <div
              class="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300"
            >
              <span class="relative flex h-2.5 w-2.5">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
                />
                <span
                  class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"
                />
              </span>
              Live moments shared by the community
            </div>
            <h1
              class="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem] dark:text-white"
            >
              {{ eventName }}
            </h1>
          </div>

          <div class="flex flex-col items-end gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <label
                class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold transition hover:border-cyan-300/50 hover:bg-cyan-300/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-cyan-300 dark:border-white/15 dark:bg-white/10"
              >
                <span>Auto-scroll</span>
                <input
                  v-model="isScrollingEnabled"
                  type="checkbox"
                  role="switch"
                  aria-label="Enable auto-scroll layout"
                  class="peer sr-only"
                  @change="resetFeedPosition"
                />
                <span
                  class="relative h-5 w-9 rounded-full transition-colors"
                  :class="
                    isScrollingEnabled ? 'bg-cyan-400' : 'bg-slate-400 dark:bg-slate-600'
                  "
                  aria-hidden="true"
                >
                  <span
                    class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                    :class="isScrollingEnabled ? 'translate-x-4' : 'translate-x-0.5'"
                  />
                </span>
              </label>

              <button
                type="button"
                class="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 dark:border-white/15 dark:bg-white/10"
                :aria-label="isFullscreen ? 'Exit full screen' : 'Enter full screen'"
                :title="isFullscreen ? 'Exit full screen' : 'Enter full screen'"
                @click="toggleFullscreen"
              >
                <Icon
                  :name="
                    isFullscreen
                      ? 'heroicons:arrows-pointing-in'
                      : 'heroicons:arrows-pointing-out'
                  "
                  size="17px"
                />
              </button>

              <button
                type="button"
                class="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 dark:border-white/15 dark:bg-white/10"
                :aria-label="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
                :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="toggleTheme"
              >
                <Icon
                  :name="isDarkTheme ? 'heroicons:sun' : 'heroicons:moon'"
                  size="17px"
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <section
        v-if="!posts.length"
        class="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center dark:border-white/15 dark:bg-white/3"
      >
        <div class="max-w-md">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-700 dark:text-cyan-200"
          >
            <Icon name="heroicons:photo" size="30px" />
          </div>
          <h2 class="mt-5 text-2xl font-bold">The first moment is waiting</h2>
          <p class="mt-2 text-slate-500 dark:text-slate-400">
            Scan the upload code to share what’s happening at {{ eventName }}.
          </p>
        </div>
      </section>

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
        v-if="qrUrl"
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

const route = useRoute();
const colorMode = useColorMode();
const eventName = computed(() => route.params.event || "event");
const posts = ref([]);
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
    if (response?.data?.posts) {
      posts.value = response.data.posts;
    }
  } catch (error) {
    console.warn("Wall load failed:", error);
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
