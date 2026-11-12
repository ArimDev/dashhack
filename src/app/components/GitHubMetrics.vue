<template>
    <div class="space-y-4" data-testid="github-metrics">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-gray-600 dark:text-gray-300">Default branch · 24 hourly buckets · browser-local times</p>
            <button type="button" :disabled="loading" @click="load" class="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-semibold dark:border-gray-600">{{ loading ? 'Loading…' : 'Refresh metrics' }}</button>
        </div>
        <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{{ error }}</p>
        <template v-if="data">
            <p v-if="data.stale || data.partial" role="status" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{{ data.warning || (data.truncated ? 'Showing the first 1,000 commits in this window.' : `Line statistics are still loading for ${data.pendingDetails} commits. The next check continues from the cache.`) }}</p>
            <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div v-for="metric in summary" :key="metric.label" class="rounded-xl bg-gray-50 p-3 dark:bg-gray-900"><dt class="text-xs text-gray-600 dark:text-gray-300">{{ metric.label }}</dt><dd class="mt-1 text-2xl font-bold">{{ metric.value }}</dd></div>
            </dl>
            <p class="text-xs text-gray-600 dark:text-gray-300">Last commit: {{ date(data.lastCommitAt) }} · Checked: {{ date(data.checkedAt) }}<span v-if="data.cached"> · Cached</span><span v-if="data.nextCheckAt"> · Next check after {{ date(data.retryAt || data.nextCheckAt) }}</span></p>
            <div class="grid min-w-0 gap-4 xl:grid-cols-2">
                <section class="min-w-0 rounded-xl border border-gray-200 p-3 dark:border-gray-700"><h3 class="text-sm font-semibold">Commits per hour</h3><apexchart type="bar" height="230" :options="options('commits')" :series="[{name:'Commits',data:[...data.commits].reverse()}]" /></section>
                <section class="min-w-0 rounded-xl border border-gray-200 p-3 dark:border-gray-700"><h3 class="text-sm font-semibold">Lines changed per hour</h3><apexchart type="area" height="230" :options="options('lines')" :series="[{name:'Lines changed',data:[...data.diff].reverse()}]" /></section>
            </div>
            <details><summary class="min-h-11 cursor-pointer py-3 text-sm font-semibold">Accessible hourly table</summary><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th class="p-2">Hour</th><th class="p-2">Commits</th><th class="p-2">Lines changed</th></tr></thead><tbody><tr v-for="(hour,i) in [...data.hours].reverse()" :key="i" class="border-t border-gray-200 dark:border-gray-700"><td class="p-2">{{ date(hour) }}</td><td class="p-2">{{ [...data.commits].reverse()[i] }}</td><td class="p-2">{{ [...data.diff].reverse()[i] }}</td></tr></tbody></table></div></details>
            <p class="text-xs text-gray-600 dark:text-gray-300">Line changes count additions and deletions, including merges. These activity counts do not measure project quality or individual contribution.</p>
        </template>
    </div>
</template>
<script setup>
const props=defineProps({team:{type:Object,required:true},active:Boolean});
const Apexchart=defineAsyncComponent(()=>import('vue3-apexcharts'));
const eventName=useState('currentEvent').value,{getSeries}=useGithubSeries(eventName),colorMode=useColorMode();
const data=ref(null),error=ref(''),loading=ref(false);
const date=value=>value?(Number.isNaN(Date.parse(value))?value:new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})):'No commits in this window';
const summary=computed(()=>[{label:'Commits',value:data.value.commits.reduce((n,x)=>n+x,0)},{label:'Lines added',value:data.value.additions??'—'},{label:'Lines deleted',value:data.value.deletions??'—'},{label:'Contributors',value:data.value.contributors??'—'}]);
const options=kind=>({chart:{id:`${kind}-${props.team._id}`,toolbar:{show:false},background:'transparent',fontFamily:'inherit'},theme:{mode:colorMode.value},colors:[kind==='lines'?'#3081e0':props.team.color],dataLabels:{enabled:false},stroke:{curve:'straight',width:2},xaxis:{categories:[...data.value.hours].reverse().map(hour=>Number.isNaN(Date.parse(hour))?hour:new Date(hour).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})),labels:{rotate:-45,hideOverlappingLabels:true}},yaxis:{min:0,forceNiceScale:true,labels:{formatter:value=>Math.round(value).toLocaleString()}},grid:{borderColor:colorMode.value==='dark'?'#374151':'#e5e7eb'}});
async function load(){if(loading.value||!props.team.github)return;loading.value=true;error.value='';try{const response=await getSeries(props.team.github);if(response.status!==200){data.value=null;throw Error(response.message||'Metrics unavailable.');}data.value=response;}catch(e){error.value=e.message;}finally{loading.value=false;}}
let timer;
function refreshVisible(){if(props.active&&document.visibilityState==='visible')load();}
onMounted(()=>{load();timer=setInterval(refreshVisible,120000);window.addEventListener('focus',refreshVisible);});
onBeforeUnmount(()=>{clearInterval(timer);window.removeEventListener('focus',refreshVisible);});
</script>
