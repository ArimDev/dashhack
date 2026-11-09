<template>
  <article
    :data-wall-post-id="post.id"
    class="mb-4 w-full break-inside-avoid-column overflow-hidden rounded-3xl border shadow-xl transition duration-300 hover:-translate-y-0.5"
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

    <div class="p-4">
      <p v-if="post.text" class="whitespace-pre-wrap wrap-break-word text-sm leading-6">
        {{ fullText ? post.text : truncatedText }}
      </p>
      <button v-if="!fullText && post.text?.length > textPreviewLength" type="button" data-read-post aria-haspopup="dialog" :tabindex="decorative ? -1 : undefined" @click="emit('read', post)"
        class="mt-1 inline-flex min-h-11 items-center text-xs font-semibold underline">Read full post</button>
      <div
        v-if="post.imageUrl"
        class="mt-3 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
      >
        <img
          :src="post.imageUrl"
          :alt="post.authorName ? `Post by ${post.authorName}` : 'Shared post image'"
          class="max-h-105 w-full object-cover"
          loading="lazy"
        />
      </div>
      <div v-else-if="post.videoUrl" class="mt-3 overflow-hidden rounded-2xl bg-black">
        <video
          :src="post.videoUrl"
          :controls="!decorative"
          :tabindex="decorative ? -1 : undefined"
          playsinline
          muted
          class="max-h-105 w-full object-contain"
        />
      </div>
      <a
        v-if="post.sourceUrl"
        :href="post.sourceUrl"
        :tabindex="decorative ? -1 : undefined"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200"
        :class="isBlueCard ? 'hover:text-slate-200 text-white' : ''"
      >
        View original <Icon name="heroicons:arrow-top-right-on-square" size="14px" />
      </a>
    </div>
  </article>
</template>

<script setup>
import Badge from "../ui/Badge.vue";
import { wallPlatformMeta } from "../../utils/wallPlatforms";

const emit = defineEmits(['read']);
const props = defineProps({
  fullText: Boolean,
  decorative: Boolean,
  post: {
    type: Object,
    required: true,
  },
  textPreviewLength: {
    type: Number,
    default: 100,
  },
});

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
