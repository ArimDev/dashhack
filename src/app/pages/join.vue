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
            <form v-if="!result" @submit.prevent="join" class="space-y-4">
                <p>Zadej své uživatelské jméno na GitHubu. Pozvánku obdržíš automaticky; pak ji přijmi na GitHubu a můžeš nahrávat kód do repozitáře svého týmu.</p>
                <label class="block font-semibold">Tvoje GitHub uživatelské jméno
                    <input v-model="username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" required placeholder="Např. student-dev" class="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-transparent px-3 text-base font-normal dark:border-gray-600" />
                </label>
                <button :disabled="busy" class="min-h-12 w-full rounded-xl bg-bluey-500 px-4 font-semibold text-white hover:bg-bluey-600 disabled:opacity-50">{{ busy ? 'Posílám pozvánku…' : 'Získat přístup k repozitáři' }}</button>
                <p class="text-sm text-gray-500 dark:text-gray-400">Ještě nemáš účet? <a href="https://github.com/signup" target="_blank" rel="noopener noreferrer" class="underline">Vytvoř si ho na GitHubu</a> a vrať se sem.</p>
            </form>
            <div v-else class="space-y-4" role="status">
                <p v-if="result.alreadyHasAccess"><strong>{{ result.username }}</strong> už má přístup k repozitáři.</p>
                <template v-else>
                    <p>Pozvánka pro <strong>{{ result.username }}</strong> je připravená.</p>
                    <p>Přihlas se na GitHubu jako <strong>{{ result.username }}</strong> a přijmi pozvánku. Tím získáš oprávnění nahrávat kód.</p>
                    <a :href="result.invitationUrl" rel="noreferrer" class="flex min-h-12 items-center justify-center rounded-xl bg-bluey-500 px-4 font-semibold text-white">Přijmout pozvánku na GitHubu</a>
                </template>
                <a :href="result.repositoryUrl" rel="noreferrer" class="inline-flex min-h-11 items-center underline">Otevřít repozitář</a>
                <button @click="result = null; error = ''" class="block min-h-11 text-sm underline">Zadat jiné GitHub jméno</button>
            </div>
        </template>
        <p v-if="error" role="alert" class="break-words text-red-700 dark:text-red-300">{{ error }}</p>
        <p v-if="!team && !loading" class="text-sm">Ověř, že jsi otevřel/a celý odkaz od organizátora, včetně části za znakem #.</p>
    </main>
</template>
<script setup>
const team = ref(null), username = ref(''), result = ref(null), error = ref(''), loading = ref(true), busy = ref(false);
let token = '';
useHead({ title: 'Připojit se k týmu | DashHack', meta: [{ name: 'referrer', content: 'no-referrer' }, { name: 'robots', content: 'noindex,nofollow' }] });
async function request(action) {
    const response = await $fetch('/api/github/join', { method: 'POST', body: { action, token, ...(action === 'invite' ? { username: username.value } : {}) }, timeout: 90000 });
    if (response.status !== 200) throw new Error(response.message || 'Pozvánku se nepodařilo zpracovat. Zkus to znovu.');
    return response;
}
onMounted(async () => {
    token = window.location.hash.slice(1);
    try { if (!token) throw new Error('Chybí odkaz na tým.'); team.value = (await request('preview')).team; }
    catch (failure) { error.value = failure.message; }
    finally { loading.value = false; }
});
async function join() {
    if (busy.value) return;
    busy.value = true; error.value = '';
    try { result.value = await request('invite'); }
    catch (failure) { error.value = failure.message; }
    finally { busy.value = false; }
}
</script>
