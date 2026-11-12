<template>
    <div class="mx-auto max-w-5xl space-y-5 pb-20">
        <header class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h1 class="flex items-center gap-2 text-xl font-bold"><Icon name="heroicons:clipboard-document-list" size="26px" />History</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">All team notes and recorded changes to teams, notes, Kanban status, matrices and event settings.</p>
            <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">History starts with this release; older actions cannot be reconstructed. The latest 10,000 entries per event are retained. Dashboard actions use Shared event login; note creators and assignees are separate attribution.</p>
        </header>
        <p v-if="!canEdit" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">Log in to this event to view history.</p>
        <template v-else>
            <div class="flex flex-wrap items-end gap-3">
                <label class="min-w-0 flex-1 text-sm font-semibold">Team history
                    <select :value="teamFilter" aria-label="Team history" @change="changeTeam($event.target.value)" class="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"><option value="">All teams &amp; event</option><option v-for="team in data.teams" :key="team._id" :value="team._id">{{ team.name }}</option><option v-if="teamFilter && !data.teams.some(t=>t._id===teamFilter)" :value="teamFilter">Deleted team</option></select>
                </label>
                <button type="button" :disabled="loading" @click="load()" class="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-semibold dark:border-gray-600">{{ loading ? 'Loading…' : 'Refresh history' }}</button>
            </div>
            <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{{ error }}</p>
            <section aria-labelledby="history-notes-title" class="space-y-3">
                <h2 id="history-notes-title" class="text-lg font-bold">All notes ({{ notes.length }})</h2>
                <p v-if="!loading && !notes.length" class="text-sm text-gray-600 dark:text-gray-300">No notes for this selection.</p>
                <ol class="space-y-3" aria-label="All team notes">
                    <li v-for="note in notes" :key="note.id" :data-testid="`history-note-${note.id}`" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <h3 class="flex items-center gap-2 font-semibold"><Icon name="heroicons:document-text" size="24px" class="shrink-0 text-bluey-600 dark:text-bluey-300" />{{ note.teamName }} · {{ note.type === 'help_request' ? 'Help request' : 'Mentor note' }}</h3>
                        <p class="mt-2 whitespace-pre-wrap break-words text-sm">{{ note.content || 'Empty note' }}</p>
                        <p v-if="note.inKanban" class="mt-2 text-sm font-semibold">{{ note.status }} · {{ note.priority }} priority<span v-if="note.assigneeName"> · Assignee: {{ note.assigneeName }}</span></p>
                        <p class="mt-2 text-xs text-gray-600 dark:text-gray-300"><span v-if="note.creatorName">Creator attribution: {{ note.creatorName }} · </span><time v-if="note.createdAt" :datetime="note.createdAt">{{ date(note.createdAt) }}</time><span v-else>Creation time unavailable.</span></p>
                        <NuxtLink :to="`${base}/teams#team-${note.teamId}`" class="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-bluey-700 dark:text-bluey-300">Open team</NuxtLink>
                    </li>
                </ol>
            </section>
            <h2 class="text-lg font-bold">Recorded changes</h2>
            <p v-if="!loading && !entries.length" class="py-6 text-center text-gray-600 dark:text-gray-300">No activity recorded yet for this selection.</p>
            <ol class="space-y-3" aria-label="Activity timeline">
                <li v-for="entry in entries" :key="entry.id" :data-testid="`activity-${entry.kind}`" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div class="flex items-start gap-3">
                        <Icon :name="entry.kind.startsWith('note.')?'heroicons:document-text':entry.kind.startsWith('matrix.')?'heroicons:table-cells':'heroicons:clipboard-document-list'" size="24px" class="shrink-0 text-bluey-600 dark:text-bluey-300" />
                        <div class="min-w-0 flex-1">
                            <h2 class="font-semibold">{{ labels[entry.kind] || entry.kind }}<span v-if="entry.teamName"> · {{ entry.teamName }}</span></h2>
                            <p class="mt-1 text-xs text-gray-600 dark:text-gray-300"><time :datetime="entry.createdAt">{{ date(entry.createdAt) }}</time> · {{ entry.actor }}<span v-if="entry.source === 'discord'"> · Discord</span></p>
                            <p v-if="entry.details.content" class="mt-3 whitespace-pre-wrap break-words text-sm">{{ entry.details.content }}</p>
                            <p v-if="entry.details.name" class="mt-2 break-words text-sm">{{ entry.details.name }}</p>
                            <p v-if="entry.details.notePreview" class="mt-3 break-words text-sm text-gray-600 dark:text-gray-300">Note: {{ entry.details.notePreview }}</p>
                            <p v-if="entry.kind.startsWith('note.') && entry.entityId" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Note ID: {{ entry.entityId }}</p>
                            <p v-if="entry.details.fields?.length" class="mt-3 text-sm">Changed: {{ entry.details.fields.map(field=>fieldLabels[field]||field).join(', ') }}</p>
                            <p v-if="entry.details.mentorChanged" class="mt-2 text-sm">Matrix mentor attribution changed.</p>
                            <ul v-if="entry.details.changes?.length" class="mt-3 space-y-2 text-sm">
                                <li v-for="change in entry.details.changes" :key="change.field"><strong>{{ fieldLabels[change.field] || change.field }}:</strong> <span class="whitespace-pre-wrap break-words">{{ display(change.from) }} → {{ display(change.to) }}</span><span v-if="change.excerpt" class="block text-xs text-gray-500 dark:text-gray-400">Text excerpts, up to 500 characters per version.</span></li>
                            </ul>
                            <div v-if="entry.teamId && data.teams.some(t=>t._id===entry.teamId)" class="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-bluey-700 dark:text-bluey-300">
                                <NuxtLink :to="`${base}/teams#team-${entry.teamId}`">Open team</NuxtLink>
                                <NuxtLink v-if="entry.kind.startsWith('matrix.')" :to="`${base}/matice#matrix-${entry.teamId}`">Open matrix</NuxtLink>
                            </div>
                        </div>
                    </div>
                </li>
            </ol>
            <button v-if="hasMore" type="button" :disabled="loading" @click="load(true)" class="min-h-11 w-full rounded-xl border border-gray-300 px-4 font-semibold dark:border-gray-600">Load older entries</button>
        </template>
    </div>
</template>
<script setup>
definePageMeta({layout:'dashboard',middleware:['routes']});
const eventName=useState('currentEvent'),data=useState('eventData'),canEdit=useState('eventCanEdit'),route=useRoute(),router=useRouter();
const base=computed(()=>`/app/${encodeURIComponent(eventName.value)}`),teamFilter=computed(()=>String(route.query.team||''));
const entries=ref([]),notes=ref([]),hasMore=ref(false),loading=ref(false),error=ref('');
const labels={'event.created':'Event created','event.updated':'Event settings changed','team.created':'Team created','team.updated':'Team updated','team.deleted':'Team deleted','note.created':'Note created','note.updated':'Note updated','note.deleted':'Note deleted','matrix.updated':'Matrix updated','worknote.added':'Earlier manual entry'};
const fieldLabels={content:'Text',status:'Status',priority:'Priority',type:'Note type',inKanban:'Kanban tracking',creatorId:'Creator attribution',assigneeId:'Assignee',color:'Color',project_abstract:'Project abstract',name:'Name',github:'Repository',description:'Description',originality:'Originality',password:'Password',githubToken:'GitHub credentials',event:'Event name'};
const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'full',timeStyle:'long'});
const display=value=>value===null||value===undefined||value===''?'—':typeof value==='boolean'?(value?'On':'Off'):String(value);
let controller;
async function load(older=false){
    if(!canEdit.value)return;controller?.abort();const request=controller=new AbortController();loading.value=true;error.value='';
    try{
        const result=await $fetch('/api/activity',{query:{event:eventName.value,teamId:teamFilter.value,...(older&&entries.value.length?{before:entries.value.at(-1).id}:{})},signal:request.signal});
        if(result.status!==200){if([401,403].includes(result.status)){canEdit.value=false;entries.value=[];notes.value=[];}throw Error(result.message||'History unavailable.');}
        if(request.signal.aborted)return;if(!older)notes.value=result.notes||[];entries.value=older?[...entries.value,...result.entries]:result.entries;hasMore.value=result.hasMore;
    }catch(e){if(!request.signal.aborted)error.value=e.message;}finally{if(controller===request)loading.value=false;}
}
function changeTeam(id){router.replace({query:{...route.query,team:id||undefined}});}
watch(teamFilter,()=>{entries.value=[];notes.value=[];load();});
watch(canEdit,value=>{if(value)load();else{controller?.abort();entries.value=[];notes.value=[];}});
function refreshFocus(){if(document.visibilityState==='visible')load();}
onMounted(()=>{load();window.addEventListener('focus',refreshFocus);});
onBeforeUnmount(()=>{controller?.abort();window.removeEventListener('focus',refreshFocus);});
</script>
