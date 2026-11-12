<template>
  <div class="whitespace-pre-wrap wrap-break-word">
    <div v-for="(block, index) in content" :key="index" class="min-h-5 mb-1" :class="{ 'flex gap-2': block.type === 'bullet' }">
      <span v-if="block.type === 'bullet'" aria-hidden="true">•</span>
      <span class="min-w-0"><span v-for="(run, runIndex) in block.runs" :key="runIndex" :class="{ 'font-bold': run.bold, italic: run.italic }"><template v-for="(token, tokenIndex) in wallTextLinks(run.text, platform)" :key="tokenIndex"><a v-if="token.href" :href="token.href" target="_blank" rel="noopener noreferrer" :tabindex="decorative ? -1 : undefined" class="relative z-20 font-semibold underline decoration-current/50 underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2" @click.stop>{{ token.text }}</a><template v-else>{{ token.text }}</template></template></span></span>
    </div>
  </div>
</template>

<script setup>
import { wallTextLinks } from '../../../shared/wallLinks.js';
import { wallTextBlocks } from '../../../shared/wallText.js';
const props = defineProps({ text: { type: String, default: '' }, blocks: Array, platform: String, decorative: Boolean });
// The editor may retain empty paragraphs; keep wall cards compact without rewriting the post.
const content = computed(() => (props.blocks || wallTextBlocks(props.text))
  .filter(block => block.runs.some(run => run.text.trim().length > 0)));
</script>
