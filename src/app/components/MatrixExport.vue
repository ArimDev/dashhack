<template>
    <div class="shrink-0">
        <button type="button" :disabled="busy" class="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700" @click="download">{{ busy ? 'Příprava exportu…' : label }}</button>
        <p v-if="error" role="alert" class="mt-1 max-w-64 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
</template>
<script setup>
import { downloadMatrixExport } from '../utils/exportStartupMatrix.js';
const props=defineProps({teams:{type:Array,required:true},eventName:{type:String,required:true},mentors:{type:Array,default:()=>[]},label:{type:String,default:'Exportovat matici (.xlsx)'}});
const busy=ref(false),error=ref('');
async function download(){
    if(busy.value)return;
    busy.value=true;error.value='';
    try{await downloadMatrixExport(props.eventName,props.teams,props.mentors);}
    catch(failure){error.value=failure.message||'Export se nepodařil.';}
    finally{busy.value=false;}
}
</script>
