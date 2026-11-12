<template>
    <section class="team-note-lane min-w-0 overflow-hidden rounded-xl border bg-white dark:bg-gray-800" :class="completed ? 'lane-completed border-gray-300 dark:border-gray-600' : issues ? 'border-amber-300 dark:border-amber-700' : 'border-bluey-200 dark:border-bluey-800'" :data-note-lane="completed ? 'done' : issues ? 'issues' : 'notes'" :aria-labelledby="headingId">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-sm" :class="completed ? 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300' : issues ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-bluey-100 bg-bluey-50 dark:border-bluey-800 dark:bg-bluey-950/30'">
            <div class="min-w-0">
                <h3 :id="headingId" class="flex items-center gap-2 font-bold"><Icon :name="completed ? 'heroicons:check-circle' : issues ? 'heroicons:hand-raised' : 'heroicons:document-text'" size="22px" /><span>{{ completed ? 'Done' : issues ? 'Issues' : 'Notes' }}</span><span class="rounded-full bg-white px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-100">{{ notes.length }}</span></h3>
            </div>
            <button v-if="!readOnly && !completed" type="button" :data-testid="issues ? 'add-help-btn' : 'add-note-btn'" @click="emit('add')" class="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold dark:bg-gray-800" :class="issues ? 'border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-950' : 'border-bluey-300 text-bluey-700 hover:bg-bluey-100 dark:text-bluey-200 dark:hover:bg-bluey-950'">
                <Icon name="heroicons:plus" size="20px" />{{ issues ? 'Add issue' : 'Add note' }}
            </button>
        </header>
        <div ref="contentElement" class="p-3">
            <div class="team-notes-grid grid items-start gap-3">
                <StickyNote v-for="note in notes" :key="note.id" :data-note-id="note.id" :note="note" :team-color="teamColor" :mentors="mentors" :read-only="readOnly" issue-mode
                    @update="(note, done) => emit('update', note, done)" @delete="id => emit('delete', id)" />
            </div>
            <p v-if="!notes.length" class="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">{{ issues ? 'No issues for this team.' : 'No mentor notes for this team.' }}</p>
        </div>
    </section>
</template>
<script setup>
const props=defineProps({notes:{type:Array,default:()=>[]},issues:Boolean,completed:Boolean,teamName:String,teamColor:String,mentors:{type:Array,default:()=>[]},readOnly:Boolean});
const emit=defineEmits(['update','delete','add']);
const headingId=useId(),contentElement=ref(null);
let observer,lastWidth=-1;
function fitText(){
    const el=contentElement.value;if(!el)return;
    for(const textarea of el.querySelectorAll('textarea')){textarea.style.height='auto';textarea.style.height=textarea.scrollHeight+'px';}
}
onMounted(()=>{
    observer=new ResizeObserver(entries=>{
        const width=Math.round(entries[0].contentRect.width);
        if(width===lastWidth)return;lastWidth=width;
        if(width>0)fitText();
    });
    observer.observe(contentElement.value);
});
onBeforeUnmount(()=>observer?.disconnect());
</script>
<style scoped>
.team-notes-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); }
:deep(.sticky-note textarea) { max-height: none; overflow-y: hidden; }
.lane-completed :deep(.sticky-note) { background: #f3f4f6; border-color: #d1d5db; box-shadow: none; }
.lane-completed :deep(.sticky-note > header) { background: #e5e7eb; color: #374151; }
.lane-completed :deep(.sticky-note textarea) { color: #4b5563; }
</style>
<style>
.dark .team-note-lane.lane-completed .sticky-note { background: #1f2937; border-color: #4b5563; }
.dark .team-note-lane.lane-completed .sticky-note > header { background: #374151; color: #d1d5db; }
.dark .team-note-lane.lane-completed .sticky-note textarea { color: #d1d5db; }
</style>
