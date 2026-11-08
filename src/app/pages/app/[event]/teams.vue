<template>
    <ClientOnly>
        <div v-if="!data.teams.length" class="text-center flex justify-center items-center min-h-[81vh]">
            <h1 class="mt-[-10px] text-3xl text-gray-500 dark:text-gray-400">No teams found.<br>Get started by adding one!</h1>
        </div>

        <div v-show="(openAddTeam || openConfirm)" class="fixed inset-0 flex justify-center items-center z-[150]">
            <AddTeam v-show="openAddTeam" :team="selectedTeam || false" @close="close" />
            <Confirm v-show="openConfirm" subject="Delete Team" message="Are you sure you want to delete team $var?" :team="selectedTeam" @close="close" />
        </div>

        <div v-if="!!data.teams.length" class="flex flex-col gap-6 w-full pb-24 max-w-7xl mx-auto">
            <Icon style="display: none;" name="heroicons:magnifying-glass-plus-16-solid" />
            <Icon style="display: none;" name="heroicons:magnifying-glass-minus-16-solid" />
            <Icon style="display: none;" name="heroicons:arrows-pointing-out-16-solid" />
            <Icon style="display: none;" name="heroicons:hand-raised-16-solid" />
            <Icon style="display: none;" name="heroicons:arrow-path-16-solid" />

            <Team v-for="(team, index) in data.teams" :key="team._id"
                :team="team"
                @edit="open"
                @delete="confirm"
                @add-note="addStickyNote"
                @update-note="updateStickyNote"
                @delete-note="deleteStickyNote"
            />
        </div>

        <button data-testid="add-team-fab" @click="open(false)" class="fixed z-50 bottom-8 right-8 bg-bluey-500 hover:bg-bluey-600 text-white shadow-xl hover:shadow-2xl cursor-pointer rounded-full w-14 h-14 flex items-center justify-center transition-all duration-300 hover:scale-110">
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
        color: '#ffeb3b',
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
