<template>
    <DialogShell :title="edit ? 'Edit Team' : 'Add Team'" wide @close="emit('close', false)">
        <form :id="formId" @submit.prevent="teamSubmit">
				<div class="flex min-w-0 flex-col gap-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="block min-w-0 text-sm font-medium">Team name
<input data-testid="team-name-input" v-model="teamName" required class="mt-2 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-gray-400 focus:border-bluey-500 focus:ring-bluey-500 dark:bg-gray-700 dark:text-white" name="teamName" placeholder="Team Name">
                        </label>
                        <label class="block min-w-0 text-sm font-medium">GitHub URL (optional)
<input data-testid="team-github-input" v-model="teamGithub" type="url" class="mt-2 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-gray-400 focus:border-bluey-500 focus:ring-bluey-500 dark:bg-gray-700 dark:text-white" name="teamGithub" placeholder="GitHub URL (Optional)">
                        </label>
					</div>
                    <div class="relative">
                        <GitHubRepositoryPicker v-if="eventData?.settings?.githubApp && canEdit" @select="teamGithub = $event" />
                        <label for="teamColorInput" class="block text-sm font-medium mb-1">Team Color:</label>
                            <div class="flex items-center gap-3">
                            <input id="teamColorInput" type="color" v-model="teamColor" class="w-11 h-11 border-none cursor-pointer rounded-full p-0">
                            <span class="text-sm font-mono">{{ teamColor }}</span>
                        </div>
                    </div>
					<div>
                        <label for="teamDescriptionInput" class="block text-sm font-medium mb-1">Description (Optional):</label>
						<textarea data-testid="team-desc-input" id="teamDescriptionInput" v-model="teamDescription" class="p-3 border-2 min-h-[100px] border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold w-full trans-all-linear dark:placeholder-gray-400 focus:border-bluey-500 focus:ring-bluey-500 dark:bg-gray-700 dark:text-white resize-y" name="teamDescription" placeholder="Team Description"></textarea>
					</div>
                    <div>
                        <label for="team-originality" class="block text-sm font-medium mb-1">Originalita</label>
                        <textarea id="team-originality" v-model="teamOriginality" maxlength="10000" rows="3"
                            class="p-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm w-full dark:bg-gray-700" placeholder="Čím je projekt originální?"></textarea>
                    </div>
                    <div>
                        <p class="block text-sm font-medium mb-1">Project Abstract</p>
                        <ProjectAbstract v-model="teamProjectAbstract" />
                    </div>
				</div>

        </form>
        <template #footer>
            <button type="button" @click="emit('close', false)" class="dialog-secondary">Cancel</button>
            <button data-testid="submit-team-btn" type="submit" :form="formId" class="dialog-primary">{{ edit ? 'Save Changes' : 'Add Team' }}</button>
        </template>
    </DialogShell>
</template>

<script setup>
const { showToast } = useToast();
const formId = useId();

const emit = defineEmits(["close"]);
const props = defineProps({
	team: {
		type: [Object, Boolean],
		required: false
	},
});

const route = useRoute();
const eventData = useState('eventData');
const canEdit = useState('eventCanEdit', () => false);
const eventName = ref(route.params.event);

const colorPicker = ref(false);

const oldName = ref(""),
	teamName = ref(props.team?.name || ""),
	teamGithub = ref(props.team?.github || ""),
	teamColor = ref(props.team?.color || "#3081E0"),
	teamDescription = ref(props.team?.description || "");

const edit = computed(() => !!props.team);
const teamOriginality = ref('');
const teamProjectAbstract = ref([]);

watch(() => props.team, function (newTeam) {
    teamOriginality.value = newTeam?.originality || '';
    teamProjectAbstract.value = structuredClone(toRaw(newTeam?.projectAbstract || []));
	if (newTeam) {
		oldName.value = newTeam.name || "",
			teamName.value = newTeam.name || "",
			teamGithub.value = newTeam.github || "",
			teamColor.value = newTeam.color || "#3081E0",
			teamDescription.value = newTeam.description || "";
	} else {
		teamName.value = "",
			teamGithub.value = "",
			teamColor.value = "#3081E0",
			teamDescription.value = "";
	}
}, { immediate: true });

async function teamSubmit() {
	const teamData = {
		username: eventName.value,
		teamName: teamName.value,
		teamGithub: teamGithub.value,
		teamColor: teamColor.value,
		teamDescription: teamDescription.value,
        teamOriginality: teamOriginality.value,
        teamProjectAbstract: teamProjectAbstract.value,
	};

	if (edit.value) {
        const existingNotes = props.team?.stickyNotes || [];
		let data = await $fetch(`/api/team/edit/`, {
			method: "PUT",
			body: {
                oldName: oldName.value,
                teamId: props.team._id,
                revision: props.team.revision,
                ...teamData,
                stickyNotes: existingNotes
            }
		});

		if (!data || data.status !== 200) {
			console.log(data);
			showToast("Failed to edit the team!", data?.message);
		} else {
			emit('close', true);
			teamName.value = "",
				teamGithub.value = "",
				teamDescription.value = "";
		}
	} else {
		let data = await $fetch(`/api/team/add`, {
			method: "POST",
			body: teamData
		});

		if (!data || data.status !== 200) {
			console.log(data);
			showToast("Failed to add a team!", data?.message);
		} else {
			emit('close', true);
			teamName.value = "",
				teamGithub.value = "",
				teamDescription.value = "";
		};
	};
};
</script>

<style scoped>
input[type="color"] {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    border: 1px solid #ccc;
    border-radius: 50%;
    padding: 0;
    min-width: 2.5rem;
}
input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
}
input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
}
</style>
