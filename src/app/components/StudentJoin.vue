<template>
    <main class="mx-auto w-full max-w-lg space-y-5 px-5 py-8 text-gray-900 dark:text-gray-100 sm:py-14">
        <p class="text-sm font-semibold text-bluey-600 dark:text-bluey-400">AT&amp;T Hackathon Junior 2026</p>
        <h1 class="text-2xl font-bold">Připojit se k týmu</h1>
        <p v-if="loading" role="status">Načítám pozvánku…</p>
        <template v-if="team">
            <div class="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                <h2 class="break-words text-xl font-bold">{{ team.name }}</h2>
                <p class="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">{{ team.repository }}</p>
            </div>
            <div v-if="!result" class="space-y-4">
                <template v-if="!verified">
                    <p>Přihlas se svým GitHub účtem:</p>
                    <button @click="start" :disabled="busy" class="min-h-12 w-full rounded-xl bg-bluey-500 px-4 font-semibold text-white hover:bg-bluey-600 disabled:opacity-50">{{ busy ? 'Přesměrovávám…' : 'Pokračovat přes GitHub' }}</button>
                </template>
                <template v-else>
                    <p>Přihlášený účet: <strong>{{ verified.username }}</strong>.</p>
                    <button @click="join" :disabled="busy" class="min-h-12 w-full rounded-xl bg-bluey-500 px-4 font-semibold text-white hover:bg-bluey-600 disabled:opacity-50">{{ busy ? 'Posílám pozvánku…' : `Získat přístup jako ${verified.username}` }}</button>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Jiný účet? Přepni ho na GitHubu a otevři týmový odkaz znovu.</p>
                </template>
            </div>
            <div v-else class="space-y-4" role="status">
                <p v-if="result.alreadyHasAccess"><strong>{{ result.username }}</strong> už má přístup k repozitáři.</p>
                <template v-else>
                    <p>Pozvánka pro <strong>{{ result.username }}</strong> je připravená.</p>
                    <ol class="list-decimal space-y-2 pl-6">
                        <li>Otevři e-mail od GitHubu (zkontroluj i spam).</li>
                        <li>Klikni na <strong>View invitation</strong> a přijmi pozvánku účtem <strong>{{ result.username }}</strong>.</li>
                    </ol>
                    <p class="text-sm text-gray-600 dark:text-gray-300">E-mail chybí? Otevři pozvánky na GitHubu.</p>
                    <a href="https://github.com/settings/organizations" target="_blank" rel="noopener noreferrer" class="flex min-h-12 items-center justify-center rounded-xl bg-bluey-500 px-4 font-semibold text-white">Otevřít pozvánky na GitHubu</a>
                    <details class="text-sm text-gray-600 dark:text-gray-300">
                        <summary class="cursor-pointer py-2">GitHub hlásí 404?</summary>
                        <p>Ověř, že jsi na GitHubu přihlášen/a jako <strong>{{ result.username }}</strong>. Pak otevři pozvánku z e-mailu znovu.</p>
                    </details>
                </template>
                <a :href="result.repositoryUrl" rel="noreferrer" class="inline-flex min-h-11 items-center underline">{{ result.alreadyHasAccess ? 'Otevřít repozitář' : 'Po přijetí pozvánky: otevřít repozitář' }}</a>

            </div>
        </template>
        <p v-if="error" role="alert" class="break-words text-red-700 dark:text-red-300">{{ error }}</p>
        <p v-if="!team && !loading" class="text-sm">Otevři celý týmový odkaz včetně části za #.</p>
    </main>
</template>
<script setup>
const props = defineProps({ oauth: { type: Object, default: null } });
const team = ref(null), verified = ref(null), result = ref(null), error = ref(''), loading = ref(true), busy = ref(false);
let token = '';
useHead({ title: 'Připojit se k týmu | DashHack', meta: [{ name: 'referrer', content: 'no-referrer' }, { name: 'robots', content: 'noindex,nofollow' }] });
async function request(action) {
    const response = await $fetch('/api/github/join', { method: 'POST', body: { action, token, ...(action === 'invite' ? { claimId: verified.value?.claimId } : {}) }, timeout: 90000 });
    if (response.status !== 200) throw new Error(response.message || 'Pozvánku se nepodařilo zpracovat. Zkus to znovu.');
    return response;
}
onMounted(async () => {
    token = window.location.hash.slice(1);
    try {
        if(props.oauth) {
            window.history.replaceState({}, '', '/github/callback');
            const response=await $fetch('/api/github/join/callback',{method:'POST',body:props.oauth,timeout:45000});
            if(response.status!==200) throw new Error(response.message || 'GitHub přihlášení se nepodařilo. Otevři znovu odkaz od organizátora.');
            verified.value=response;team.value=response.team;
        } else {
            window.history.replaceState({}, '', '/join');
            if(!token) throw new Error('Chybí odkaz na tým.');team.value=(await request('preview')).team;
        }
    }
    catch (failure) { error.value = failure.message; }
    finally { loading.value = false; }
});
async function start() {
    if(busy.value) return;
    busy.value=true;error.value='';
    try {const response=await request('start');window.location.assign(response.url);}
    catch(failure) {error.value=failure.message;busy.value=false;}
}
async function join() {
    if (busy.value) return;
    busy.value = true; error.value = '';
    try { result.value = await request('invite'); }
    catch (failure) { error.value = failure.message; }
    finally { busy.value = false; }
}
</script>
