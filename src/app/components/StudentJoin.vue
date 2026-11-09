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
                    <p>Přihlas se svým GitHub účtem. Přístup můžeš získat pouze pro účet, který ověří GitHub; žádné uživatelské jméno sem nezadáváš.</p>
                    <button @click="start" :disabled="busy" class="min-h-12 w-full rounded-xl bg-bluey-500 px-4 font-semibold text-white hover:bg-bluey-600 disabled:opacity-50">{{ busy ? 'Přesměrovávám…' : 'Vybrat svůj GitHub účet' }}</button>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Stejný odkaz mohou použít všichni členové tvého týmu. Nesdílej ho mimo tým.</p>
                </template>
                <template v-else>
                    <p>GitHub ověřil tvůj účet: <strong>{{ verified.username }}</strong>.</p>
                    <button @click="join" :disabled="busy" class="min-h-12 w-full rounded-xl bg-bluey-500 px-4 font-semibold text-white hover:bg-bluey-600 disabled:opacity-50">{{ busy ? 'Posílám pozvánku…' : `Získat přístup jako ${verified.username}` }}</button>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Není to tvůj účet? Změň přihlášený účet na GitHubu a znovu otevři původní odkaz od organizátora.</p>
                </template>
            </div>
            <div v-else class="space-y-4" role="status">
                <p v-if="result.alreadyHasAccess"><strong>{{ result.username }}</strong> už má přístup k repozitáři.</p>
                <template v-else>
                    <p>Pozvánka pro <strong>{{ result.username }}</strong> je připravená.</p>
                    <ol class="list-decimal space-y-3 pl-6">
                        <li>Otevři e-mailovou schránku spojenou s GitHub účtem <strong>{{ result.username }}</strong>. Najdi pozvánku od GitHubu k tomuto repozitáři (zkontroluj i spam).</li>
                        <li>Na GitHubu ověř, že jsi přihlášen/a jako <strong>{{ result.username }}</strong>. Pokud používáš jiný účet, nejdřív ho odhlas a přihlas se správným.</li>
                        <li>V e-mailu klikni na <strong>View invitation</strong> a na GitHubu pozvánku přijmi. Teprve potom můžeš otevřít soukromý repozitář a nahrávat kód.</li>
                    </ol>
                    <p class="text-sm text-gray-600 dark:text-gray-300">E-mail zatím nepřišel? Otevři GitHub oznámení tlačítkem níže a vyhledej pozvánku k repozitáři svého týmu.</p>
                    <a href="https://github.com/notifications" target="_blank" rel="noopener noreferrer" class="flex min-h-12 items-center justify-center rounded-xl bg-bluey-500 px-4 font-semibold text-white">Otevřít GitHub oznámení</a>
                    <div class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                        <strong>Zobrazuje GitHub chybu 404?</strong> Ověř účet <strong>{{ result.username }}</strong> v profilové nabídce GitHubu a otevři odkaz z e-mailu znovu v prohlížeči s tímto účtem. Soukromý repozitář je přístupný až po přijetí pozvánky. Pokud 404 přetrvává i pod správným účtem, obrať se na organizátora; není potřeba znovu posílat žádost.
                    </div>
                </template>
                <a :href="result.repositoryUrl" rel="noreferrer" class="inline-flex min-h-11 items-center underline">{{ result.alreadyHasAccess ? 'Otevřít repozitář' : 'Po přijetí pozvánky: otevřít repozitář' }}</a>

            </div>
        </template>
        <p v-if="error" role="alert" class="break-words text-red-700 dark:text-red-300">{{ error }}</p>
        <p v-if="!team && !loading" class="text-sm">Ověř, že jsi otevřel/a celý odkaz od organizátora, včetně části za znakem #.</p>
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
