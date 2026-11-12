<template>
    <div class="mx-auto max-w-5xl space-y-5 pb-20">
        <header class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h1 class="flex items-center gap-2 text-xl font-bold"><Icon name="heroicons:clipboard-document-list" size="26px" />Worknotes &amp; activity</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Team worknotes and timestamped changes to teams, notes, Kanban status, matrices and event settings.</p>
            <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">History starts with this release; older actions cannot be reconstructed. The latest 10,000 entries per event are retained. Dashboard actions use Shared event login; note creators and assignees are separate attribution.</p>
        </header>
        <p v-if="!canEdit" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">Log in to this event to view or add worknotes and history.</p>
        <template v-else>
            <form @submit.prevent="add" class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 class="font-bold">Add worknote</h2>
                <label class="block text-sm font-semibold">Worknote for
                    <select v-model="draftTeam" :disabled="saving" aria-label="Worknote for" class="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"><option value="">Event / general</option><option v-for="team in data.teams" :key="team._id" :value="team._id">{{ team.name }}</option></select>
                </label>
                <label class="block text-sm font-semibold">Worknote<textarea v-model="content" :disabled="saving" maxlength="5000" rows="3" class="mt-1 block w-full rounded-lg border border-gray-300 bg-transparent p-3 dark:border-gray-600" placeholder="What was done, decisions, next steps…" /></label>
                <p class="text-xs text-gray-600 dark:text-gray-300">{{ content.length }}/5000 · Recorded as Shared event login. Worknotes are appended to history.</p>
                <button type="submit" :disabled="saving || !content.trim()" class="min-h-11 rounded-lg bg-bluey-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Add worknote' }}</button>
                <p role="status" class="text-sm text-emerald-700 dark:text-emerald-300">{{ feedback }}</p>
            </form>
            <div class="flex flex-wrap items-end gap-3">
                <label class="min-w-0 flex-1 text-sm font-semibold">Team history
                    <select :value="teamFilter" aria-label="Team history" @change="changeTeam($event.target.value)" class="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800"><option value="">All teams &amp; event</option><option v-for="team in data.teams" :key="team._id" :value="team._id">{{ team.name }}</option><option v-if="teamFilter && !data.teams.some(t=>t._id===teamFilter)" :value="teamFilter">Deleted team</option></select>
                </label>
                <button type="button" :disabled="loading" @click="load()" class="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-semibold dark:border-gray-600">{{ loading ? 'Loading…' : 'Refresh history' }}</button>
            </div>
            <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{{ error }}</p>
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
const entries=ref([]),content=ref(''),draftTeam=ref(teamFilter.value),hasMore=ref(false),loading=ref(false),saving=ref(false),error=ref(''),feedback=ref('');
const labels={'event.created':'Event created','event.updated':'Event settings changed','team.created':'Team created','team.updated':'Team updated','team.deleted':'Team deleted','note.created':'Note created','note.updated':'Note updated','note.deleted':'Note deleted','matrix.updated':'Matrix updated','worknote.added':'Worknote added'};
const fieldLabels={content:'Text',status:'Status',priority:'Priority',type:'Note type',inKanban:'Kanban tracking',creatorId:'Creator attribution',assigneeId:'Assignee',color:'Color',project_abstract:'Project abstract',name:'Name',github:'Repository',description:'Description',originality:'Originality',password:'Password',githubToken:'GitHub credentials',event:'Event name'};
const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'full',timeStyle:'long'});
const display=value=>value===null||value===undefined||value===''?'—':typeof value==='boolean'?(value?'On':'Off'):String(value);
let controller;
async function load(older=false){
    if(!canEdit.value)return;controller?.abort();const request=controller=new AbortController();loading.value=true;error.value='';
    try{
        const result=await $fetch('/api/activity',{query:{event:eventName.value,teamId:teamFilter.value,...(older&&entries.value.length?{before:entries.value.at(-1).id}:{})},signal:request.signal});
        if(result.status!==200){if([401,403].includes(result.status)){canEdit.value=false;entries.value=[];}throw Error(result.message||'History unavailable.');}
        if(request.signal.aborted)return;entries.value=older?[...entries.value,...result.entries]:result.entries;hasMore.value=result.hasMore;
    }catch(e){if(!request.signal.aborted)error.value=e.message;}finally{if(controller===request)loading.value=false;}
}
function changeTeam(id){router.replace({query:{...route.query,team:id||undefined}});}
watch(teamFilter,()=>{entries.value=[];if(!content.value)draftTeam.value=teamFilter.value;load();});
watch(canEdit,value=>{if(value)load();else{controller?.abort();entries.value=[];}});
async function add(){
    if(saving.value||!content.value.trim())return;saving.value=true;error.value='';feedback.value='';
    try{const result=await $fetch('/api/activity',{method:'POST',body:{event:eventName.value,teamId:draftTeam.value||null,content:content.value}});if(result.status!==200)throw Error(result.message||'Could not save worknote.');content.value='';feedback.value='Worknote added.';await load();}catch(e){error.value=e.message;}finally{saving.value=false;}
}
function refreshFocus(){if(document.visibilityState==='visible')load();}
function unload(event){if(content.value.trim()){event.preventDefault();event.returnValue='';}}
onBeforeRouteLeave(()=>!content.value.trim()||window.confirm('Leave and discard this unsaved worknote?'));
onMounted(()=>{load();window.addEventListener('focus',refreshFocus);window.addEventListener('beforeunload',unload);});
onBeforeUnmount(()=>{controller?.abort();window.removeEventListener('focus',refreshFocus);window.removeEventListener('beforeunload',unload);});
</script>
