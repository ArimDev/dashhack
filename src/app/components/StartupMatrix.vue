<template>
    <div class="space-y-4 pt-3" data-testid="startup-matrix">
        <div class="flex flex-wrap justify-between items-start gap-3">
            <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Otázky CzechInvestu pomáhají ověřit nápad a jeho konkurenceschopnost. Vyplnit můžete jen některé odpovědi.</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Vyplněno {{ completed }}/10 odpovědí.<span v-if="mentorName"> Zpracoval/a: {{ mentorName }}.</span></p>
            </div>
            <button v-if="canEdit && !editing" type="button" @click="startEditing"
                class="rounded-lg px-3 py-2 bg-bluey-500 hover:bg-bluey-600 text-white text-sm">Upravit matici</button>
        </div>
        <form v-if="editing" @submit.prevent="save" class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">Výchozí otázky nahraďte nebo doplňte odpověďmi týmu. Nezměněné otázky se nepočítají jako odpovědi.</p>
            <label class="block text-sm font-medium">Zpracoval/a mentor
                <select v-model="mentorId" :disabled="saving" aria-label="Mentor startupové matice"
                    class="block mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 max-w-full">
                    <option value="">Bez vybraného mentora</option>
                    <option v-for="mentor in eventData.mentors || []" :key="mentor.id" :value="mentor.id">{{ mentor.name }}</option>
                </select>
            </label>
            <p v-if="!eventData.mentors?.length" class="text-xs text-gray-500 dark:text-gray-400">Nejprve se můžete přidat na stránce Mentors.</p>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div v-for="field in STARTUP_MATRIX_FIELDS" :key="field.key" class="min-w-0 space-y-2">
                    <h3 class="text-sm font-semibold">{{ field.label }}</h3>
                    <ProjectAbstract v-model="draft[field.key]" :label="field.label" :read-only="saving" />
                </div>
            </div>
            <p v-if="error" role="alert" class="rounded-lg p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">{{ error }}</p>
            <div class="flex flex-wrap gap-3">
                <button type="submit" :disabled="saving" class="rounded-lg px-4 py-2 bg-bluey-500 hover:bg-bluey-600 text-white text-sm disabled:opacity-50">{{ saving ? 'Ukládání…' : 'Uložit matici' }}</button>
                <button type="button" :disabled="saving" @click="editing = false" class="rounded-lg px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm">Zrušit</button>
                <button v-if="conflict" type="button" :disabled="saving" @click="reload"
                    class="text-sm underline">Zahodit rozepsané změny a načíst aktuální data</button>
            </div>
        </form>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section v-for="field in STARTUP_MATRIX_FIELDS" :key="field.key"
                :data-testid="`matrix-field-${field.key}`" class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 min-w-0">
                <h3 class="text-sm font-semibold">{{ field.label }}</h3>
                <p v-if="team.startupMatrix?.[field.key]" class="text-xs text-gray-500 dark:text-gray-400">{{ field.prompt }}</p>
                <ProjectAbstract :model-value="team.startupMatrix?.[field.key] ?? matrixQuestion(field)" read-only
                    :class="{ 'text-gray-500 dark:text-gray-400': !team.startupMatrix?.[field.key]?.length }" />
                <p v-if="team.startupMatrix?.[field.key]?.length === 0" class="text-sm text-gray-500 dark:text-gray-400">Bez odpovědi.</p>
            </section>
        </div>
        <p role="status" aria-live="polite" class="text-sm text-gray-500 dark:text-gray-400">{{ feedback }}</p>
    </div>
</template>

<script setup>
import { STARTUP_MATRIX_FIELDS, matrixQuestion } from '~~/shared/startupMatrix.js';
const props = defineProps({ team: { type: Object, required: true } });
const eventData = useState('eventData');
const currentEvent = useState('currentEvent');
const canEdit = useState('eventCanEdit', () => false);
const editing = ref(false), saving = ref(false), conflict = ref(false);
const draft = ref({}), mentorId = ref(''), error = ref(''), feedback = ref('');
let revision, base;
const completed = computed(() => STARTUP_MATRIX_FIELDS.filter(field => props.team.startupMatrix?.[field.key]?.some(block => block.runs.some(run => run.text.trim()))).length);
const mentorName = computed(() => eventData.value.mentors?.find(mentor => mentor.id === props.team.matrixMentorId)?.name);

function startEditing() {
    revision = props.team.revision;
    base = JSON.parse(JSON.stringify(props.team.startupMatrix || {}));
    draft.value = Object.fromEntries(STARTUP_MATRIX_FIELDS.map(field => [field.key,
        JSON.parse(JSON.stringify(base[field.key] ?? matrixQuestion(field)))]));
    mentorId.value = props.team.matrixMentorId || '';
    error.value = ''; feedback.value = ''; conflict.value = false; editing.value = true;
}
async function save() {
    if (!canEdit.value || saving.value) return;
    saving.value = true; error.value = ''; conflict.value = false;
    const answers = {};
    for (const field of STARTUP_MATRIX_FIELDS) {
        if (JSON.stringify(draft.value[field.key]) !== JSON.stringify(base[field.key] ?? matrixQuestion(field))) answers[field.key] = draft.value[field.key];
    }
    try {
        const response = await $fetch('/api/team/matrix', { method: 'PATCH', body: {
            username: currentEvent.value, teamId: props.team._id, revision, answers, mentorId: mentorId.value || null,
        } });
        if (response.status !== 200) { conflict.value = response.status === 409; throw new Error(response.message || 'Matici se nepodařilo uložit.'); }
        const team = eventData.value.teams.find(team => team._id === props.team._id);
        if (team) {
            team.startupMatrix = response.startupMatrix; team.matrixMentorId = response.matrixMentorId;
            team.revision = Math.max(team.revision, response.revision);
        }
        editing.value = false; feedback.value = 'Startupová matice uložena.';
    } catch (failure) { error.value = failure.message || 'Matici se nepodařilo uložit. Rozepsané odpovědi zůstaly zachované.'; }
    finally { saving.value = false; }
}
async function reload() {
    saving.value = true;
    try {
        const response = await $fetch(`/api/event/${encodeURIComponent(currentEvent.value)}`);
        if (response.status !== 200) throw new Error(response.message || 'Data se nepodařilo načíst.');
        eventData.value = response.data;
        canEdit.value = !!response.canEdit;
        await nextTick();
        startEditing();
    } catch (failure) { error.value = failure.message; }
    finally { saving.value = false; }
}
</script>
