<template>
    <ClientOnly>
        <div v-if="!data.teams.length" class="text-center flex justify-center items-center min-h-[81vh]">
            <h1 class="mt-[-10px] text-3xl text-gray-500 dark:text-gray-400">No teams found.<br>Get started by adding one!</h1>
        </div>
        
        <div v-show="(openAddTeam || openConfirm)" class="fixed inset-0 flex justify-center items-center z-[100]">
            <AddTeam v-show="openAddTeam" :team="selectedTeam || false" @close="close" />
            <Confirm v-show="openConfirm" subject="Delete Team" message="Are you sure, that you want to delete team $var?" :team="selectedTeam" @close="close" />
        </div>

        <div v-if="!!data.teams.length" class="grid grid-cols-1 gap-4 max-w-7xl mx-auto w-full">
            <Icon style="display: none;" name="heroicons:magnifying-glass-plus-16-solid" />
            <Icon style="display: none;" name="heroicons:magnifying-glass-minus-16-solid" />
            <Icon style="display: none;" name="heroicons:arrows-pointing-out-16-solid" />
            <Icon style="display: none;" name="heroicons:hand-raised-16-solid" />
            <Icon style="display: none;" name="heroicons:arrow-path-16-solid" />
            
            <Team v-for="(team, index) in data.teams" :key="index" 
                :team="team" 
                @edit="open" 
                @delete="confirm"
                @add-note="addStickyNote"
                @update-note="updateStickyNote"
                @delete-note="deleteStickyNote"
            />
        </div>

        <button @click="open(false)" class="fixed bg-bluey-500 hover:bg-bluey-600 h-16 w-16 shadow-lg cursor-pointer rounded-full flex items-center justify-center transition-all duration-300 z-50 bottom-8 right-8 hover:scale-110 hover:rotate-90">
            <Icon name="heroicons:plus" size="32px" class="text-white" />
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

defineOgImageComponent('NuxtSeo', {
    title: currentEvent,
    description: "Teams",
    theme: config.public.color,
    colorMode: 'dark',
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

const saveTeamChanges = async (teamIndex, successMessage) => {
    const team = data.value.teams[teamIndex];
    if (!team) return;

    try {
        const response = await $fetch(`/api/team/edit`, {
            method: 'PUT',
            body: {
                username: currentEvent.value,
                oldName: team.name,
                teamName: team.name,
                teamColor: team.color,
                teamGithub: team.github,
                teamDescription: team.description,
                stickyNotes: team.stickyNotes
            }
        });
        if (response.status !== 200) {
            throw new Error(response.message || 'Failed to save changes');
        }
        showToast("Success", successMessage, 2000);
    } catch (error) {
        console.error("Error saving team changes:", error);
        showToast("Error saving changes!", error.message);
        
        const freshData = await $fetch(`/api/event/${currentEvent.value}`);
        if (freshData && freshData.data) data.value = freshData.data;
    }
}

const addStickyNote = (teamName) => {
    const teamIndex = findTeamIndex(teamName);
    if (teamIndex === -1) return;

    const newNote = {
        id: uuidv4(),
        content: '',
        color: '#ffeb3b',
        priority: 'medium',
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