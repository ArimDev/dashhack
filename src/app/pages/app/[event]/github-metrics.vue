<template>
    <div class="space-y-4 pb-20">
        <header class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h1 class="flex items-center gap-2 text-xl font-bold"><Icon name="heroicons:chart-bar" size="26px" />GitHub metrics</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Open a team to view its graphs. Results are shared through a persistent cache, checked at most every two minutes while open. Only new commit details are downloaded.</p>
            <label class="mt-4 block text-sm font-semibold">Find team<input v-model="search" type="search" class="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-600" /></label>
        </header>
        <p v-if="!data.teams.length" class="p-4 text-gray-600 dark:text-gray-300">No teams yet.</p>
        <section v-for="team in data.teams" :key="team._id" v-show="matches(team.name)" :id="`metrics-${team._id}`" :data-testid="`metrics-team-${team.name}`" class="scroll-mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <button type="button" :aria-expanded="!!opened[team._id]" :aria-controls="`graphs-${team._id}`" @click="toggle(team._id)" class="flex min-h-16 w-full items-center gap-3 border-l-[6px] px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700" :style="{borderLeftColor:team.color}">
                <Icon name="heroicons:chart-bar" size="24px" class="shrink-0 text-bluey-600 dark:text-bluey-300" /><span class="min-w-0 flex-1 font-bold">{{ team.name }}<span class="mt-1 block break-all text-xs font-normal text-gray-600 dark:text-gray-300">{{ team.github || 'No repository linked' }}</span></span><Icon :name="opened[team._id]?'heroicons:chevron-up':'heroicons:chevron-down'" size="22px" />
            </button>
            <div v-if="loaded[team._id]" v-show="opened[team._id]" :id="`graphs-${team._id}`" class="border-t border-gray-200 p-4 dark:border-gray-700">
                <GitHubMetrics v-if="team.github" :team="team" :active="!!opened[team._id]" />
                <p v-else class="text-sm text-gray-600 dark:text-gray-300">Add a GitHub repository in Edit team to see activity.</p>
            </div>
        </section>
    </div>
</template>
<script setup>
definePageMeta({layout:'dashboard',middleware:['routes']});
const data=useState('eventData'),route=useRoute(),search=ref(''),opened=ref({}),loaded=ref({});
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const matches=value=>normalize(value).includes(normalize(search.value));
function toggle(id){opened.value[id]=!opened.value[id];loaded.value[id]=true;}
async function openLinked(){const id=route.hash.replace(/^#metrics-/,'');if(!data.value.teams.some(t=>t._id===id))return;search.value='';opened.value[id]=true;loaded.value[id]=true;await nextTick();document.getElementById(`metrics-${id}`)?.scrollIntoView({block:'start'});}
watch(()=>route.hash,openLinked);onMounted(openLinked);
</script>
