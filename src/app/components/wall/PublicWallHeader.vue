<template>
  <header class="fixed inset-y-0 left-0 z-20 flex w-14 flex-col items-center justify-center gap-3 sm:w-20" data-testid="wall-title-rail">
    <h1 :class="hashtag ? 'max-h-[calc(100dvh-10rem)]' : 'max-h-[calc(100dvh-2rem)]'" class="overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-black tracking-wide text-slate-800 [writing-mode:vertical-rl] rotate-180 dark:text-slate-100 sm:text-4xl [@media(max-height:500px)]:text-xl">{{ eventName }}</h1>
    <p v-if="hashtag" data-testid="wall-posting-hashtag" class="shrink-0 text-sm font-bold text-bluey-600 [writing-mode:vertical-rl] rotate-180 dark:text-bluey-300 sm:text-base">{{ hashtag }}</p>
  </header>
  <a v-if="uploadsEnabled && wallStatus === 'available'" :href="uploadUrl" target="_blank" rel="noopener noreferrer"
    data-testid="wall-sharing-qr" :class="{ 'lg:hidden': !showSharingQr || !qrUrl }"
    class="wall-sharing-qr fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-30 flex min-h-11 w-11 items-center justify-center text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500 dark:text-white">
    <img v-if="showSharingQr && qrUrl" :src="qrUrl" alt="Scan to upload a post" width="160" height="160" class="hidden aspect-square h-auto w-full shrink-0 bg-white p-2 lg:block" />
    <span class="lg:hidden"><Icon name="heroicons:photo" size="24px" /></span>
    <span class="sr-only">Share a moment</span>
  </a>
</template>
<script setup>
defineProps({eventName:{type:String,required:true},hashtag:{type:String,default:''},wallStatus:{type:String,required:true},uploadsEnabled:Boolean,showSharingQr:Boolean,uploadUrl:{type:String,required:true},qrUrl:{type:String,default:''}});
</script>

<style scoped>
@media (min-width: 1024px) {
  .wall-sharing-qr {
    /* Keep gutter-filling size; only the QR square has a white background. */
    width: min(max(186px, calc((100vw - 1800px) / 2 - 2rem)), calc(100dvh - 2rem));
  }
}
</style>
