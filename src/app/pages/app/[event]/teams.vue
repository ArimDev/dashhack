<template>
    <ClientOnly>
        <div v-if="!data.teams.length" class="text-center flex justify-center items-center min-h-[55dvh]">
            <h1 class="mt-[-10px] text-xl sm:text-3xl text-gray-500 dark:text-gray-400">No teams found.<br>Get started by adding one!</h1>
        </div>

        <AddTeam v-if="openAddTeam" :team="selectedTeam || false" @close="close" />
        <Confirm v-if="openConfirm" subject="Delete Team" message="Are you sure you want to delete team $var?" :team="selectedTeam" @close="close" />

        <div v-if="!!data.teams.length" class="w-full pb-24">
            <Icon style="display: none;" name="heroicons:magnifying-glass-plus-16-solid" />
            <Icon style="display: none;" name="heroicons:magnifying-glass-minus-16-solid" />
            <Icon style="display: none;" name="heroicons:arrows-pointing-out-16-solid" />
            <Icon style="display: none;" name="heroicons:hand-raised-16-solid" />
            <Icon style="display: none;" name="heroicons:arrow-path-16-solid" />

            <div class="sm:sticky top-0 z-10 mb-5 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/95 sm:flex-row sm:items-end">
                <div class="min-w-0 flex-1">
                    <label for="team-search" class="mb-1 block text-sm font-semibold text-gray-800 dark:text-gray-200">Search teams</label>
                    <div class="flex items-center gap-2">
                        <input id="team-search" v-model="search" type="search" placeholder="Name, description or repository…" class="min-h-11 min-w-0 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-900 dark:border-gray-600 dark:text-gray-100" />
                        <button v-if="search" @click="search = ''" class="min-h-11 rounded-lg px-3 text-sm text-bluey-600 dark:text-bluey-400">Clear</button>
                    </div>
                    <p role="status" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ visibleIds.size }} of {{ data.teams.length }} teams</p>
                </div>
                <div class="min-w-0 sm:w-64 sm:pb-5">
                    <label for="team-jump" class="mb-1 block text-sm font-semibold text-gray-800 dark:text-gray-200">Jump to team</label>
                    <select id="team-jump" :value="''" @change="jumpToTeam($event)" class="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                        <option value="" disabled>Choose a team…</option>
                        <option v-for="team in data.teams" :key="team._id" :value="team._id">{{ team.name }}</option>
                    </select>
                </div>
            </div>
            <div v-if="!visibleIds.size" class="py-12 text-center text-gray-500 dark:text-gray-400">No teams match your search.</div>
            <div data-testid="teams-grid" class="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <div v-for="team in data.teams" :key="team._id" v-show="visibleIds.has(team._id)" :id="`team-${team._id}`" tabindex="-1" class="team-anchor min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-bluey-500">
                    <Team
                        :team="team"
                        @edit="open"
                        @delete="confirm"
                        @add-note="addStickyNote"
                        @update-note="updateStickyNote"
                        @delete-note="deleteStickyNote"
                    />
                </div>
            </div>
        </div>

        <button v-if="canEdit" data-testid="add-team-fab" @click="open(false)" aria-label="Add team" class="add-team-fab fixed z-40 bg-bluey-500 hover:bg-bluey-600 text-white shadow-xl hover:shadow-2xl cursor-pointer rounded-full w-14 h-14 flex items-center justify-center transition-all duration-300 hover:scale-110">
            <Icon name="heroicons:plus" size="28px" />
        </button>
    </ClientOnly>
</template>

<script setup>
import { v4 as uuidv4 } from 'uuid';

definePageMeta({
    layout: 'dashboard',
    middleware: ["routes"],
});

const currentEvent = useState('currentEvent'),
    data = useState('eventData'),
    config = useRuntimeConfig();

watchEffect(() => {
    useHead({
        title: currentEvent.value + " | DashHack"
    });
});


const { showToast } = useToast();
const canEdit = useState('eventCanEdit', () => false);

const search = ref('');
// Accent-insensitive matching also accepts Czech names typed without diacritics.
const normalizeSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const visibleIds = computed(() => {
    const terms = normalizeSearch(search.value).trim().split(/\s+/).filter(Boolean);
    return new Set(data.value.teams.filter(team => {
        const text = normalizeSearch([team.name, team.description, team.github, team.originality].join(' '));
        return terms.every(term => text.includes(term));
    }).map(team => team._id));
});
async function jumpToTeam(event) {
    const id = event.target.value;
    event.target.value = '';
    search.value = '';
    await nextTick();
    const target = document.getElementById(`team-${id}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

const openAddTeam = ref(false),
    openConfirm = ref(false),
    selectedTeam = ref(false);

async function open(team) {
    if (team) selectedTeam.value = team;
    else selectedTeam.value = false;
    openAddTeam.value = true;
};

async function confirm(team) {
    selectedTeam.value = team;
    openConfirm.value = true;
};

async function close(added) {
    openAddTeam.value = false;
    openConfirm.value = false;
    selectedTeam.value = false;
    if (added) {
        const freshData = await $fetch(`/api/event/${currentEvent.value}`);
        if (freshData && freshData.data) {
            data.value = freshData.data;
        }
    }
};

const findTeamIndex = (teamName) => {
    if (!data.value || !data.value.teams) return -1;
    return data.value.teams.findIndex(t => t.name === teamName);
}

// Keep snapshots in order, but use the last acknowledged revision for each save.
// A rejected queue skips subsequent stale snapshots until the event is refreshed.
const saveQueues = new Map();
const saveTeamChanges = (teamIndex, successMessage) => {
    const snapshot = JSON.parse(JSON.stringify(data.value.teams[teamIndex]));
    const task = (saveQueues.get(snapshot._id) || Promise.resolve()).then(async () => {
        const current = data.value.teams.find(team => team._id === snapshot._id);
        if (!current) return;
        const response = await $fetch('/api/team/edit', {
            method: 'PUT',
            body: {
                username: currentEvent.value,
                teamId: snapshot._id,
                revision: current.revision,
                oldName: snapshot.name,
                teamName: snapshot.name,
                teamColor: snapshot.color,
                teamGithub: snapshot.github,
                teamDescription: snapshot.description,
                teamOriginality: snapshot.originality,
                teamProjectAbstract: snapshot.projectAbstract,
                stickyNotes: snapshot.stickyNotes,
            },
        });
        if (response.status !== 200) throw new Error(response.message || 'Failed to save changes');
        current.revision = response.revision;
        showToast('Success', successMessage, 2000);
    });
    saveQueues.set(snapshot._id, task);
    task.catch(async (error) => {
        showToast('Error saving changes!', error.message);
        const fresh = await $fetch(`/api/event/${encodeURIComponent(currentEvent.value)}`);
        if (fresh.data) data.value = fresh.data;
    }).catch(console.error).finally(() => {
        if (saveQueues.get(snapshot._id) === task) saveQueues.delete(snapshot._id);
    });
};

const addStickyNote = ({ teamName, type }) => {
    const teamIndex = findTeamIndex(teamName);
    if (teamIndex === -1) return;

    const newNote = {
        id: uuidv4(),
        content: '',
        color: data.value.teams[teamIndex].color,
        priority: 'medium',
        type,
        creatorId: null,
        inKanban: type === 'help_request',
        status: 'To Do'
    };

    if (!data.value.teams[teamIndex].stickyNotes) {
        data.value.teams[teamIndex].stickyNotes = [];
    }

    data.value.teams[teamIndex].stickyNotes.push(newNote);
    saveTeamChanges(teamIndex, "Note added.");
};

const updateStickyNote = ({ teamName, note: updatedNote }) => {
    const teamIndex = findTeamIndex(teamName);
    if (teamIndex === -1) return;

    const noteIndex = data.value.teams[teamIndex].stickyNotes.findIndex(n => n.id === updatedNote.id);
    if (noteIndex === -1) return;

    data.value.teams[teamIndex].stickyNotes[noteIndex] = updatedNote;
    saveTeamChanges(teamIndex, "Note updated.");
};

const deleteStickyNote = ({ teamName, noteId }) => {
    const teamIndex = findTeamIndex(teamName);
    if (teamIndex === -1) return;

    data.value.teams[teamIndex].stickyNotes = data.value.teams[teamIndex].stickyNotes.filter(n => n.id !== noteId);
    saveTeamChanges(teamIndex, "Note deleted.");
};
</script>

<style scoped>
.team-anchor { scroll-margin-top: 9rem; }
@media (max-width: 639px) { .team-anchor { scroll-margin-top: 1rem; } }
</style>
