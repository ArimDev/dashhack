<template>
  <article
    ref="cardElement"
    :data-wall-post-id="post.id"
    :data-projector-announcement="projectorAnnouncement || undefined"
    :style="projectorAnnouncement ? { '--announcement-size': `${announcementSize}px` } : undefined"
    class="wall-panel relative mb-4 w-full break-inside-avoid-column overflow-hidden rounded-3xl border shadow-xl transition duration-300 hover:-translate-y-0.5"
    :class="
      isBlueCard
        ? 'border-bluey-500/40 bg-bluey-500 text-white hover:border-bluey-500/60 dark:border-bluey-500/50'
        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:hover:border-white/20'
    "
  >
    <div
      class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-white/6"
    >
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-cyan-700 dark:bg-white/7 dark:text-cyan-100"
        >
          <Icon
            :name="wallPlatformMeta[post.platform]?.icon || 'heroicons:photo'"
            size="19px"
          />
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold" :class="isBlueCard ? 'text-white' : 'text-slate-900 dark:text-white'">
            {{ post.authorName || "Anonymous" }}
          </p>
          <p class="truncate text-xs" :class="isBlueCard ? 'text-slate-200' : 'text-slate-500'">
            <span>{{ post.handle || wallPlatformMeta[post.platform]?.label || "Community post" }}</span>
            <span v-if="timestamp" class="ml-1 whitespace-nowrap opacity-80">· <time :datetime="post.createdAt">{{ timestamp }}</time></span>
          </p>
        </div>
      </div>
      <Badge v-if="post.pinned" :variant="isBlueCard ? 'inverse' : 'cyan'" upper>
        <Icon name="heroicons:map-pin" size="12px" />
        Pinned
      </Badge>
    </div>

    <div class="wall-panel-copy p-4 flex flex-col" :class="{ 'projector-copy sm:p-6': projectorAnnouncement }">
      <WallPostText v-if="post.richText?.length" :blocks="shortened ? wallTextPreview(post.richText, textDisplay.limit) : post.richText" :platform="post.platform" :decorative="decorative"
        class="wall-formatted-copy wrap-break-word leading-relaxed" :class="textOnly ? 'text-base md:text-lg' : ''" />
      <WallPostText v-else-if="post.text" :text="shortened ? post.text.slice(0, textDisplay.limit) + '...' : post.text" :platform="post.platform" :decorative="decorative" class="wall-plain-copy leading-relaxed" :class="textOnly ? 'text-base md:text-lg' : 'text-sm'" />
      <button v-if="shortened" type="button" data-read-post aria-haspopup="dialog" :tabindex="decorative ? -1 : undefined" class="relative z-20 mt-1 inline-flex min-h-11 items-center text-xs font-semibold underline" @click="emit('read', post)">Read full article</button>
      <div
        v-if="post.imageUrl && !post.videoUrl"
        ref="mediaContainer" class="mt-3 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
      >
        <img
          :src="mediaReady ? post.imageUrl : undefined"
          :style="wallMediaStyle(post.mediaLayout)"
          :alt="post.authorName ? `Post by ${post.authorName}` : 'Shared post image'"
          :class="fullText ? 'max-h-[60vh] w-full object-contain' : 'block h-auto w-full'"
          loading="lazy" decoding="async"
        />
      </div>
      <div v-else-if="post.videoUrl" ref="mediaContainer" class="mt-3 overflow-hidden rounded-2xl bg-black">
        <video
          :src="mediaReady ? post.videoUrl : undefined"
          class="relative z-20"
          :poster="mediaReady ? post.imageUrl || undefined : undefined"
          :controls="!decorative"
          :tabindex="decorative ? -1 : undefined"
          preload="none"
          playsinline
          muted
          :class="fullText ? 'max-h-[60vh] w-full object-contain' : 'block h-auto w-full'"
        />
      </div>
      <a
        v-if="post.sourceUrl"
        :href="post.sourceUrl"
        :aria-label="post.platform === 'x' ? 'Open original post on X' : post.platform === 'instagram' ? 'Open original post on Instagram' : 'View original post'"
        :tabindex="decorative ? -1 : undefined"
        target="_blank"
        rel="noopener noreferrer"
        class="absolute inset-0 z-10 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500"
      >
        <span class="sr-only">{{ post.platform === 'x' ? 'Open original post on X' : post.platform === 'instagram' ? 'Open original post on Instagram' : 'View original post' }}</span>
      </a>
    </div>
  </article>
</template>

<script setup>
import { wallTextDisplay } from '../../../shared/wallTextDisplay.js';
import { wallTextPreview } from '../../../shared/wallText.js';
import { wallMediaStyle } from '../../../shared/wallMediaLayout.js';
import { formatWallTimestamp } from '../../../shared/wallTimestamp.js';
import { observeWallMedia } from "../../utils/lazyWallMedia.js";
import Badge from "../ui/Badge.vue";
import { wallPlatformMeta } from "../../utils/wallPlatforms";

const emit = defineEmits(['height', 'read']);
const props = defineProps({
  projectorAnnouncement: Boolean,
  fullText: Boolean,
  decorative: Boolean,
  post: {
    type: /** @type {import('vue').PropType<import('../../../shared/wallPost').WallPost>} */ (Object),
    required: true,
  },
});

const mediaContainer = ref(null), mediaReady = ref(props.fullText);
const textDisplay = computed(() => wallTextDisplay(props.post));
const timestamp = computed(() => formatWallTimestamp(props.post.createdAt));
const shortened = computed(() => !props.fullText && textDisplay.value.enabled && (props.post.text || '').length > textDisplay.value.limit);
const textOnly = computed(() => !props.post.imageUrl && !props.post.videoUrl);
const cardElement = ref(null);
let cardResizeObserver;
onMounted(() => {
  if (props.decorative) return;
  cardResizeObserver = new ResizeObserver(() => {
    emit('height', props.post.id, Math.ceil(cardElement.value.getBoundingClientRect().height));
  });
  cardResizeObserver.observe(cardElement.value);
});
onBeforeUnmount(() => cardResizeObserver?.disconnect());
const announcementSize = computed(() => {
  const text = props.post.text || '';
  // Short lines and bullet lists also consume space, independently of character count.
  const weight = text.length + Math.max(0, text.split('\n').length - 1) * 60;
  return weight <= 400 ? 32 : weight <= 1000 ? 28 : weight <= 2000 ? 24 : 20;
});
let stopObserving;
watch(mediaContainer, element => {
  stopObserving?.();
  if (element && !mediaReady.value) stopObserving = observeWallMedia(element, () => { mediaReady.value = true; });
}, { flush: 'post' });
onBeforeUnmount(() => stopObserving?.());

const isBlueCard = computed(() => {
  const id = String(props.post?.id || "");
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = ((hash << 5) - hash + id.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 10 < 4;
});
</script>

<style scoped>
.wall-panel { margin-bottom: var(--panel-gap, 16px); border-radius: var(--panel-radius, 24px); }
.wall-panel-copy { padding: var(--panel-padding, 16px); }
.wall-panel-copy:not(.projector-copy) > .wall-plain-copy,
.wall-panel-copy:not(.projector-copy) > .wall-formatted-copy { font-size: var(--panel-text-size, 16px); }
.wall-formatted-copy :deep(.min-h-5) { line-height: 1.6; }
.wall-formatted-copy.text-base { font-size: 1rem; }
@media (min-width: 768px) { .wall-formatted-copy { font-size: 1.125rem; } }
.projector-copy > .wall-plain-copy, .projector-copy > .wall-formatted-copy {
  font-size: clamp(18px, 2.2vw, var(--announcement-size));
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.projector-copy :deep(.min-h-5) { min-height: 0; line-height: 1.45; margin-bottom: .4em; }
</style>
