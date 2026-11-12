<template>
    <div class="space-y-5 pb-20">
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 class="flex items-center gap-2 text-xl font-bold"><Icon name="heroicons:table-cells" size="26px" />Startupové matice</h1>
                    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Hotová matice má odpovědi ve všech 10 oblastech. Rozpracované odpovědi můžete průběžně ukládat.</p>
                </div>
                <MatrixExport :teams="data.teams" :event-name="currentEvent" :mentors="data.mentors || []" label="Export všech matic (.xlsx)" />
            </div>
            <div class="mt-4 flex flex-wrap gap-3 text-sm" aria-live="polite">
                <span class="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Hotové: {{ counts.complete }}</span>
                <span class="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">Rozpracované: {{ counts.partial }}</span>
                <span class="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">Nevyplněné: {{ counts.empty }}</span>
            </div>
            <div class="mt-4 flex flex-wrap items-end gap-3">
                <label class="min-w-0 flex-1 text-sm font-semibold">Hledat tým
                    <input v-model="search" type="search" class="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-600" />
                </label>
                <label class="text-sm font-semibold">Stav matice
                    <select v-model="filter" class="mt-1 block min-h-11 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800">
                        <option value="all">Všechny</option><option value="incomplete">Nedokončené</option><option value="empty">Nevyplněné</option><option value="complete">Hotové</option>
                    </select>
                </label>
                <button type="button" :disabled="refreshing" @click="refresh(true)" class="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-semibold dark:border-gray-600">{{ refreshing ? 'Načítání…' : 'Refresh' }}</button>
            </div>
            <p v-if="error" role="alert" class="mt-3 text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        </div>
        <p v-if="!visibleTeams.length" class="py-8 text-center text-gray-600 dark:text-gray-300">Žádné týmy k zobrazení.</p>
        <section v-for="team in data.teams" :key="team._id" v-show="visibleTeams.includes(team._id)" :id="`matrix-${team._id}`"
            :data-testid="`matrix-team-${team.name}`" class="scroll-mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-800"
            :class="matrixCompletedCount(team) === 10 ? 'border-emerald-300 dark:border-emerald-700' : matrixCompletedCount(team) ? 'border-amber-300 dark:border-amber-700' : 'border-red-300 dark:border-red-700'">
            <button type="button" @click="toggle(team._id)" :aria-expanded="!!opened[team._id]" :aria-controls="`answers-${team._id}`"
                class="flex min-h-16 w-full flex-wrap items-center gap-3 border-l-[6px] px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700" :style="{borderLeftColor:team.color}">
                <Icon name="heroicons:table-cells" size="24px" class="shrink-0 text-bluey-600 dark:text-bluey-300" />
                <span class="min-w-0 flex-1 font-bold">{{ team.name }}</span>
                <span class="rounded-lg px-3 py-1 text-sm font-semibold" :class="matrixCompletedCount(team) === 10 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : matrixCompletedCount(team) ? 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'">
                    {{ matrixCompletedCount(team) === 10 ? 'Hotová' : matrixCompletedCount(team) ? 'Rozpracovaná' : 'Nevyplněná' }} · {{ matrixCompletedCount(team) }}/10
                </span>
                <Icon :name="opened[team._id] ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" size="22px" />
            </button>
            <div v-if="loaded[team._id]" v-show="opened[team._id]" :id="`answers-${team._id}`" class="border-t border-gray-200 p-4 dark:border-gray-700">
                <StartupMatrix :team="team" />
            </div>
        </section>
    </div>
</template>
<script setup>
import {matrixCompletedCount} from '~~/shared/startupMatrix.js';
definePageMeta({layout:'dashboard',middleware:['routes']});
const currentEvent=useState('currentEvent'),data=useState('eventData'),canEdit=useState('eventCanEdit');
const route=useRoute(),search=ref(''),filter=ref('all'),opened=ref({}),loaded=ref({}),refreshing=ref(false),error=ref('');
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const counts=computed(()=>data.value.teams.reduce((result,team)=>{const n=matrixCompletedCount(team);result[n===10?'complete':n?'partial':'empty']++;return result;},{complete:0,partial:0,empty:0}));
const visibleTeams=computed(()=>data.value.teams.filter(team=>{
    const n=matrixCompletedCount(team);
    return normalize(team.name).includes(normalize(search.value)) && (filter.value==='all'||filter.value==='incomplete'&&n<10||filter.value==='empty'&&!n||filter.value==='complete'&&n===10);
}).map(team=>team._id));
function editing(){return !!document.querySelector('[data-matrix-editing="true"]');}
async function toggle(id){opened.value[id]=!opened.value[id];loaded.value[id]=true;if(opened.value[id])await refresh(false);}
async function openLinked(){
    const id=route.hash.replace(/^#matrix-/,'');
    if(!data.value.teams.some(team=>team._id===id))return;
    search.value='';filter.value='all';opened.value[id]=true;loaded.value[id]=true;
    await nextTick();document.getElementById(`matrix-${id}`)?.scrollIntoView({block:'start'});
}
watch(()=>route.hash,openLinked);
let controller,timer;
async function refresh(manual=false){
    if(refreshing.value)return;
    if(editing()){if(manual)error.value='Nejprve uložte nebo zavřete rozepsané změny.';return;}
    const snapshot=data.value,eventName=currentEvent.value,revisions=JSON.stringify(snapshot.teams.map(t=>[t._id,t.revision]));
    const request=controller=new AbortController();refreshing.value=true;error.value='';
    try{
        const response=await $fetch(`/api/event/${encodeURIComponent(eventName)}`,{signal:request.signal});
        if(response.status!==200)throw Error(response.message||'Data se nepodařilo načíst.');
        if(request.signal.aborted||currentEvent.value!==eventName||data.value!==snapshot||editing()||revisions!==JSON.stringify(data.value.teams.map(t=>[t._id,t.revision])))return;
        data.value=response.data;canEdit.value=!!response.canEdit;
    }catch(e){if(manual&&!request.signal.aborted)error.value=e.message;}
    finally{if(controller===request){refreshing.value=false;controller=null;}}
}
function focusRefresh(){if(document.visibilityState==='visible')refresh(false);}
function unload(event){if(editing()){event.preventDefault();event.returnValue='';}}
onBeforeRouteLeave(()=>!editing()||window.confirm('Opustit stránku a zahodit rozepsané změny matice?'));
onMounted(()=>{openLinked();timer=setInterval(focusRefresh,15000);window.addEventListener('focus',focusRefresh);window.addEventListener('beforeunload',unload);});
onBeforeUnmount(()=>{clearInterval(timer);controller?.abort();window.removeEventListener('focus',focusRefresh);window.removeEventListener('beforeunload',unload);});
</script>
