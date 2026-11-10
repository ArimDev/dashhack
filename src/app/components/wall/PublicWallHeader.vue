<template>
  <header class="fixed inset-y-0 left-0 z-20 flex w-14 items-center justify-center sm:w-20" data-testid="wall-title-rail">
    <h1 class="max-h-[calc(100dvh-2rem)] overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-black tracking-wide text-slate-800 [writing-mode:vertical-rl] rotate-180 dark:text-slate-100 sm:text-4xl [@media(max-height:500px)]:text-xl">{{ eventName }}</h1>
  </header>
  <a v-if="uploadsEnabled && wallStatus === 'available'" :href="uploadUrl" target="_blank" rel="noopener noreferrer"
    data-testid="wall-sharing-qr" class="fixed right-[max(1rem,env(safe-area-inset-right))] top-1/2 -translate-y-1/2 z-30 flex min-h-11 lg:w-[186px] flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-semibold text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <img v-if="showSharingQr && qrUrl" :src="qrUrl" alt="Scan to upload a post" width="160" height="160" class="hidden aspect-square h-auto w-full rounded bg-white p-2 lg:block" />
    <span>Share a moment</span>
  </a>
</template>
<script setup>
defineProps({eventName:{type:String,required:true},wallStatus:{type:String,required:true},uploadsEnabled:Boolean,showSharingQr:Boolean,uploadUrl:{type:String,required:true},qrUrl:{type:String,default:''}});
</script>
