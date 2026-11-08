<template>
  <article
    class="relative rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between p-2">
      <div class="relative min-w-0 flex-1 overflow-hidden rounded-2xl">
        <div class="mb-2 flex items-center gap-2">
          <Badge variant="slate" size="xs" upper>
            <Icon
              :name="wallPlatformMeta[post.platform]?.icon || 'heroicons:photo'"
              size="12px"
            />
          </Badge>
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {{ post.authorName || "Anonymous" }}
          </span>
          <span v-if="post.handle" class="text-xs text-slate-500">{{ post.handle || wallPlatformMeta[post.platform]?.label || "Community post" }}</span>
          <Badge v-if="post.pinned" variant="cyan" upper>
            <Icon name="heroicons:map-pin" size="12px" />
            Pinned
          </Badge>
        </div>

        <p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200 px-2">
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

        <div
          v-if="post.hidden"
          class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/40 backdrop-blur-sm"
        >
          <div class="flex flex-col items-center gap-2">
            <Icon
              :name="post.status === 'rejected' ? 'heroicons:x-circle' : 'heroicons:eye-slash'"
              size="32px"
              class="text-white/90"
            />
            <span class="text-xs font-semibold text-white/90">
              {{ post.status === "rejected" ? "Rejected" : "Hidden from wall" }}
            </span>
          </div>
        </div>
      </div>

      <div class="relative z-10 flex flex-col gap-3 md:items-end md:gap-2">
        <div v-if="post.status === 'pending'" class="flex flex-wrap items-center gap-2">
          <button
            class="rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600 active:scale-95"
            @click="emit('action', 'approve')"
          >
            ✓ Approve
          </button>
          <button
            class="rounded-full bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 active:scale-95"
            @click="emit('action', 'reject')"
          >
            ✕ Reject
          </button>
        </div>

        <div v-else-if="post.status === 'approved'" class="flex items-center gap-2">
          <Badge
            v-if="!post.pinned && expired"
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
              class="rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
              @click="emit('toggle-menu')"
            >
              <Icon name="heroicons:ellipsis-horizontal" size="18px" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="emit('action', post.hidden ? 'unhide' : 'hide'); emit('close-menu')"
              >
                <Icon :name="post.hidden ? 'heroicons:eye' : 'heroicons:eye-slash'" size="16px" />
                {{ post.hidden ? "Unhide" : "Hide" }}
              </button>
              <button
                class="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="emit('action', post.pinned ? 'unpin' : 'pin'); emit('close-menu')"
              >
                <Icon name="heroicons:map-pin" size="16px" :class="{ 'opacity-40': !post.pinned }" />
                {{ post.pinned ? "Unpin" : "Pin" }}
              </button>
              <button
                v-if="post.hidden"
                class="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
                @click="emit('delete'); emit('close-menu')"
              >
                <Icon name="heroicons:trash" size="16px" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="post.status === 'rejected'" class="relative">
          <button
            class="rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            @click="emit('toggle-menu')"
          >
            <Icon name="heroicons:ellipsis-horizontal" size="18px" />
          </button>
          <div
            v-if="menuOpen"
            class="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              class="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              @click="emit('action', 'unreject'); emit('close-menu')"
            >
              <Icon name="heroicons:arrow-uturn-left" size="16px" />
              Undo
            </button>
            <button
              class="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
              @click="emit('delete'); emit('close-menu')"
            >
              <Icon name="heroicons:trash" size="16px" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="menuOpen" class="fixed inset-0" @click="emit('close-menu')" />
  </article>
</template>

<script setup>
import Badge from "../ui/Badge.vue";
import { wallPlatformMeta } from "../../utils/wallPlatforms";

defineProps({
  post: { type: Object, required: true },
  menuOpen: { type: Boolean, default: false },
  expired: { type: Boolean, default: false },
});

const emit = defineEmits(["action", "toggle-menu", "close-menu", "delete"]);
</script>