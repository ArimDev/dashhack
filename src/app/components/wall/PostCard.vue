<template>
  <article
    :data-wall-post-id="post.id"
    :data-projector-announcement="projectorAnnouncement || undefined"
    :style="projectorAnnouncement ? { '--announcement-size': `${announcementSize}px` } : undefined"
    class="relative mb-4 w-full break-inside-avoid-column overflow-hidden rounded-3xl border shadow-xl transition duration-300 hover:-translate-y-0.5"
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
            {{ post.handle || wallPlatformMeta[post.platform]?.label || "Community post" }}
          </p>
        </div>
      </div>
      <Badge v-if="post.pinned" :variant="isBlueCard ? 'inverse' : 'cyan'" upper>
        <Icon name="heroicons:map-pin" size="12px" />
        Pinned
      </Badge>
    </div>

    <div class="p-4 flex flex-col" :class="{ 'projector-copy sm:p-6': projectorAnnouncement }">
      <WallPostText v-if="post.richText?.length" :blocks="showFullCopy ? post.richText : wallTextPreview(post.richText, textPreviewLength)" :platform="post.platform" :decorative="decorative"
        class="wall-formatted-copy wrap-break-word leading-relaxed" :class="textOnly ? 'text-base md:text-lg' : ''" />
      <WallPostText v-else-if="post.text" :text="showFullCopy ? post.text : truncatedText" :platform="post.platform" :decorative="decorative" class="wall-plain-copy leading-relaxed" :class="textOnly ? 'text-base md:text-lg' : 'text-sm'" />
      <button v-if="!showFullCopy && post.text?.length > textPreviewLength" type="button" data-read-post aria-haspopup="dialog" :tabindex="decorative ? -1 : undefined" @click="emit('read', post)"
        class="relative z-20 mt-1 inline-flex min-h-11 items-center text-xs font-semibold underline">Read full post</button>
      <div
        v-if="post.imageUrl && !post.videoUrl"
        ref="mediaContainer" class="mt-3 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800" :class="fullText ? '' : 'aspect-[4/3]'"
      >
        <img
          :src="mediaReady ? post.imageUrl : undefined"
          :alt="post.authorName ? `Post by ${post.authorName}` : 'Shared post image'"
          :class="fullText ? 'max-h-[60vh] w-full object-contain' : 'h-full w-full object-contain'"
          loading="lazy" decoding="async"
        />
      </div>
      <div v-else-if="post.videoUrl" ref="mediaContainer" class="mt-3 overflow-hidden rounded-2xl bg-black" :class="fullText ? '' : 'aspect-[4/3]'">
        <video
          :src="mediaReady ? post.videoUrl : undefined"
          class="relative z-20"
          :poster="mediaReady ? post.imageUrl || undefined : undefined"
          :controls="!decorative"
          :tabindex="decorative ? -1 : undefined"
          preload="none"
          playsinline
          muted
          :class="fullText ? 'max-h-[60vh] w-full object-contain' : 'h-full w-full object-contain'"
        />
      </div>
      <a
        v-if="post.sourceUrl"
        :href="post.sourceUrl"
        :tabindex="decorative ? -1 : undefined"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200 after:absolute after:inset-0 after:z-10 after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-cyan-500"
        :class="isBlueCard ? 'hover:text-slate-200 text-white' : ''"
      >
        {{ post.platform === 'x' ? 'Open on X' : post.platform === 'instagram' ? 'Open on Instagram' : 'View original' }} <Icon name="heroicons:arrow-top-right-on-square" size="14px" />
      </a>
    </div>
  </article>
</template>

<script setup>
import { observeWallMedia } from "../../utils/lazyWallMedia.js";
import { wallTextPreview } from '../../../shared/wallText.js';
import Badge from "../ui/Badge.vue";
import { wallPlatformMeta } from "../../utils/wallPlatforms";

const emit = defineEmits(['read']);
const props = defineProps({
  projectorAnnouncement: Boolean,
  fullText: Boolean,
  decorative: Boolean,
  post: {
    type: /** @type {import('vue').PropType<import('../../../shared/wallPost').WallPost>} */ (Object),
    required: true,
  },
  textPreviewLength: {
    type: Number,
    default: 100,
  },
});

const mediaContainer = ref(null), mediaReady = ref(props.fullText);
const textOnly = computed(() => !props.post.imageUrl && !props.post.videoUrl);
const showFullCopy = computed(() => props.fullText || (props.post.pinned && textOnly.value));
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

const truncatedText = computed(() => {
  const text = props.post?.text || "";
  if (text.length <= props.textPreviewLength) return text;
  return `${text.slice(0, props.textPreviewLength)}...`;
});

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
