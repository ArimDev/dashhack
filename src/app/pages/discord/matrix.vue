<template>
    <main class="min-h-dvh bg-gray-50 px-3 py-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
        <div class="mx-auto max-w-4xl space-y-5">
            <header><h1 class="text-2xl font-bold">Startupová matice</h1><p v-if="info" class="mt-1 text-lg font-semibold">{{ info.teamName }}</p></header>
            <p v-if="loading" role="status">Načítání formuláře…</p>
            <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{{ error }}</p>
            <template v-if="info">
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ info.studentName }} · Vyplněno {{ completed }}/10. Nejvýše 600 znaků na odpověď.</p>
                <form @submit.prevent="save" class="space-y-4">
                    <section v-for="field in STARTUP_MATRIX_FIELDS" :key="field.key" class="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                        <h2 class="font-bold">{{ field.label }}</h2><p class="text-sm text-gray-500 dark:text-gray-400">{{ field.prompt }}</p>
                        <ProjectAbstract v-model="draft[field.key]" :label="field.label" :read-only="saving" />
                        <p class="text-xs" :class="matrixAnswerError(draft[field.key]) ? 'text-red-600 dark:text-red-400' : 'text-gray-500'">{{ matrixAnswerText(draft[field.key]).length }}/{{ MATRIX_ANSWER_LIMIT }}<span v-if="matrixAnswerError(draft[field.key])"> · {{ matrixAnswerError(draft[field.key]) }}</span></p>
                    </section>
                    <div class="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                        <button type="submit" :disabled="saving || !changed || invalid" class="min-h-11 rounded-lg bg-bluey-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{{ saving ? 'Ukládání…' : 'Uložit odpovědi' }}</button>
                        <button v-if="conflict" type="button" :disabled="saving" @click="load()" class="min-h-11 text-sm underline">Zahodit změny a načíst aktuální</button>
                        <p role="status" class="text-sm">{{ feedback }}</p>
                    </div>
                </form>
            </template>
            <p v-if="!loading && !info" class="text-sm">Otevřete formulář příkazem /matice v kanálu svého týmu na Discordu.</p>
        </div>
    </main>
</template>
<script setup>
import {STARTUP_MATRIX_FIELDS,matrixAnswerError,matrixAnswerText,MATRIX_ANSWER_LIMIT} from '~~/shared/startupMatrix.js';
definePageMeta({layout:false});
const info=ref(null),loading=ref(true),saving=ref(false),error=ref(''),feedback=ref(''),conflict=ref(false),draft=ref({});let base={};
const invalid=computed(()=>STARTUP_MATRIX_FIELDS.some(f=>matrixAnswerError(draft.value[f.key]||[])));
const completed=computed(()=>STARTUP_MATRIX_FIELDS.filter(f=>draft.value[f.key]?.some(b=>b.runs.some(r=>r.text.trim()))).length);
const changed=computed(()=>STARTUP_MATRIX_FIELDS.some(f=>JSON.stringify(draft.value[f.key]||[])!==JSON.stringify(base[f.key]||[])));
function apply(data){info.value=data;base=JSON.parse(JSON.stringify(data.startupMatrix));draft.value=Object.fromEntries(STARTUP_MATRIX_FIELDS.map(f=>[f.key,JSON.parse(JSON.stringify(base[f.key]||[]))]));conflict.value=false;}
async function load(claim){loading.value=true;error.value='';try{const r=await $fetch('/api/discord/matrix',claim?{method:'POST',body:claim}:{});if(r.status!==200)throw new Error(r.message);apply(r.data);}catch(e){error.value=e.message;}finally{loading.value=false;}}
async function save(){if(saving.value||!changed.value||invalid.value)return;saving.value=true;error.value='';feedback.value='';
    const answers=Object.fromEntries(STARTUP_MATRIX_FIELDS.filter(f=>JSON.stringify(draft.value[f.key])!==JSON.stringify(base[f.key]||[])).map(f=>[f.key,draft.value[f.key]]));
    try{const r=await $fetch('/api/discord/matrix',{method:'PATCH',body:{revision:info.value.revision,answers}});if(r.status!==200){conflict.value=r.status===409;throw new Error(r.message);}apply(r.data);feedback.value='Odpovědi uloženy.';}catch(e){error.value=e.message;}finally{saving.value=false;}}
onMounted(()=>{const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);const match=token.match(/^([a-f0-9-]{36})\.([a-f0-9]{64})$/);load(match?{id:match[1],token:match[2]}:undefined);});
useHead({title:computed(()=>`Startupová matice${info.value?' – '+info.value.teamName:''}`),meta:[{name:'robots',content:'noindex,nofollow'},{name:'referrer',content:'no-referrer'}]});
</script>
