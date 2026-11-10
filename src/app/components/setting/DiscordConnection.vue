<template>
    <section id="discord-app" class="rounded-3xl bg-white p-5 shadow-md dark:bg-gray-800 space-y-4 sm:col-span-2">
        <h1 class="text-2xl font-bold">Discord</h1>
        <p class="text-sm">/mentor vytvoří help request. /matice otevře formulář týmu podle kanálu.</p>
        <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" class="text-sm text-bluey-500 underline">Vytvořit aplikaci v Discord Developer Portal</a>
        <p v-if="loading" role="status">Načítání…</p>
        <template v-if="info">
            <form class="space-y-3" @submit.prevent="save">
                <fieldset :disabled="busy" class="space-y-3">
                    <label class="block text-sm">Application ID<input v-model.trim="config.applicationId" required pattern="[0-9]{17,20}" maxlength="20" class="discord-input" /></label>
                    <label class="block text-sm">Public Key<input v-model.trim="config.publicKey" required pattern="[a-fA-F0-9]{64}" maxlength="64" class="discord-input font-mono" /></label>
                    <label class="block text-sm">Server ID<input v-model.trim="config.guildId" required pattern="[0-9]{17,20}" maxlength="20" class="discord-input" /></label>
                    <details class="rounded-xl border border-gray-200 p-3 dark:border-gray-600">
                        <summary class="cursor-pointer text-sm font-semibold">Kanály týmů ({{ info.teams.length }})</summary>
                        <p class="my-2 text-xs text-gray-500 dark:text-gray-400">Discord → Nastavení → Pokročilé → Režim vývojáře. Pravým tlačítkem na kanál → Kopírovat ID kanálu.</p>
                        <label v-for="team in info.teams" :key="team.id" class="my-2 block text-sm">{{ team.name }}
                            <input v-model.trim="config.channels[team.id]" :aria-label="`Discord kanál: ${team.name}`" inputmode="numeric" maxlength="20" placeholder="ID kanálu týmu" class="discord-input" />
                        </label>
                    </details>
                    <label class="flex items-center gap-2 text-sm"><input v-model="config.enabled" type="checkbox" aria-label="Povolit Discord příkazy" />Povolit příkazy a formuláře</label>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Uložení nastavení zneplatní otevřené odkazy na matice.</p>
                    <button type="submit" class="min-h-11 rounded-lg bg-bluey-500 px-4 py-2 text-sm font-semibold text-white">Uložit Discord</button>
                </fieldset>
            </form>
            <div v-if="info.configured" class="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                <p class="text-sm">V aplikaci nastavte tento Interactions Endpoint URL:</p>
                <input :value="endpoint" aria-label="Discord Interactions Endpoint URL" readonly class="discord-input text-xs" @focus="$event.target.select()" />
                <a :href="installUrl" target="_blank" rel="noopener noreferrer" class="inline-block min-h-11 text-sm text-bluey-500 underline">Nainstalovat příkazy do serveru</a>
                <label class="block text-sm">Bot token pro jednorázovou registraci<input v-model="token" type="password" autocomplete="new-password" aria-label="Discord bot token" class="discord-input" /></label>
                <p class="text-xs text-gray-500 dark:text-gray-400">Token z karty Bot se neukládá. Aplikace nepotřebuje číst zprávy ani oprávnění Administrator.</p>
                <button type="button" :disabled="busy || !token || dirty" @click="register" class="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-gray-600">Registrovat /mentor a /matice</button>
                <button type="button" :disabled="busy" @click="load" class="ml-3 min-h-11 text-sm underline">Obnovit</button>
                <details v-if="info.audit.length" class="text-sm"><summary class="cursor-pointer font-semibold">Poslední požadavky</summary><ul class="mt-2 space-y-2"><li v-for="(row,index) in info.audit" :key="index" class="break-words">{{ row.teamName }} · {{ row.userName }} · {{ row.kind }} · {{ new Date(row.createdAt).toLocaleString('cs-CZ') }}</li></ul></details>
            </div>
        </template>
        <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <p v-if="feedback" role="status" class="text-sm text-green-700 dark:text-green-300">{{ feedback }}</p>
    </section>
</template>
<script setup>
const currentEvent=useState('currentEvent'),info=ref(null),config=ref(null),loading=ref(false),busy=ref(false),error=ref(''),feedback=ref(''),token=ref('');
const endpoint=computed(()=>import.meta.client?location.origin+'/api/discord/interactions':'');
const dirty=computed(()=>info.value&&JSON.stringify(config.value)!==JSON.stringify(info.value.config));
const installUrl=computed(()=>info.value?.configured?'https://discord.com/oauth2/authorize?'+new URLSearchParams({client_id:info.value.config.applicationId,scope:'applications.commands',guild_id:info.value.config.guildId,disable_guild_select:'true',integration_type:'0'}):'');
function apply(data){info.value=data;config.value=JSON.parse(JSON.stringify(data.config));}
async function load(){loading.value=true;error.value='';try{const r=await $fetch('/api/discord/settings',{query:{event:currentEvent.value}});if(r.status!==200)throw new Error(r.message);apply(r.data);}catch(e){error.value=e.message;}finally{loading.value=false;}}
async function save(){if(busy.value)return;busy.value=true;error.value='';feedback.value='';try{const r=await $fetch('/api/discord/settings',{method:'POST',body:{event:currentEvent.value,config:config.value}});if(r.status!==200)throw new Error(r.message);apply(r.data);feedback.value='Nastavení Discordu uloženo.';}catch(e){error.value=e.message;}finally{busy.value=false;}}
async function register(){if(busy.value)return;busy.value=true;error.value='';feedback.value='';try{const r=await $fetch('/api/discord/register',{method:'POST',body:{event:currentEvent.value,token:token.value}});if(r.status!==200)throw new Error(r.message);feedback.value=r.message;}catch(e){error.value=e.message;}finally{token.value='';busy.value=false;}}
onMounted(load);
</script>
<style>
.discord-input{display:block;width:100%;min-width:0;min-height:44px;margin-top:4px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;background:white;color:#111827}
.dark .discord-input{border-color:#4b5563;background:#111827;color:#f3f4f6}
</style>
