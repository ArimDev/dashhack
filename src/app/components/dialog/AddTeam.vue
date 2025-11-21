<template>
	<div>
		<div @click="emit('close', false)" class="absolute inset-0 bg-black opacity-45 z-40"></div>
		<div class="fixed inset-0 flex justify-center items-center z-[110]">
			<form @submit.prevent="teamSubmit" class="fixed bg-white text-black dark:bg-gray-800 dark:text-white rounded-3xl w-[90%] md:w-[70%] lg:w-[50%] max-h-[80vh] p-6 flex flex-col gap-6 shadow-xl">
				<div>
					<h1 class="text-left text-3xl font-bold">{{ edit ? "Edit Team" : "Add Team" }}</h1>
				</div>

				<div class="flex flex-col gap-4 overflow-y-auto pr-2">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<input data-testid="team-name-input" v-model="teamName" required class="p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-gray-400 focus:border-bluey-500 focus:ring-bluey-500 dark:bg-gray-700 dark:text-white" name="teamName" placeholder="Team Name">
						<input data-testid="team-github-input" v-model="teamGithub" type="url" class="p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-gray-300 dark:border-gray-600 dark:placeholder-gray-400 focus:border-bluey-500 focus:ring-bluey-500 dark:bg-gray-700 dark:text-white" name="teamGithub" placeholder="GitHub URL (Optional)">
					</div>
                    <div class="relative">
                        <label for="teamColorInput" class="block text-sm font-medium mb-1">Team Color:</label>
                            <div class="flex items-center gap-3">
                            <input id="teamColorInput" type="color" v-model="teamColor" class="w-10 h-10 border-none cursor-pointer rounded-full p-0">
                            <span class="text-sm font-mono">{{ teamColor }}</span>
                        </div>
                    </div>
					<div>
                        <label for="teamDescriptionInput" class="block text-sm font-medium mb-1">Description (Optional):</label>
						<textarea data-testid="team-desc-input" id="teamDescriptionInput" v-model="teamDescription" class="p-3 border-2 min-h-[100px] border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold w-full trans-all-linear dark:placeholder-gray-400 focus:border-bluey-500 focus:ring-bluey-500 dark:bg-gray-700 dark:text-white resize-y" name="teamDescription" placeholder="Team Description"></textarea>
					</div>
				</div>

				<div class="flex justify-between gap-4 flex-row flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
					<button type="button" @click="emit('close', false)" class="cursor-pointer rounded-full bg-gray-200 dark:bg-gray-600 w-full h-[56px] text-xl font-bold text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
						Cancel
					</button>
					<button data-testid="submit-team-btn" type="submit" class="cursor-pointer rounded-full bg-bluey-500 w-full h-[56px] text-xl font-bold text-white hover:bg-bluey-600 transition-colors">
						{{ edit ? "Save Changes" : "Add Team" }}
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup>
const { showToast } = useToast();

const emit = defineEmits(["close"]);
const props = defineProps({
	team: {
		type: [Object, Boolean],
		required: false
	},
});

const route = useRoute();
const eventName = ref(route.params.event);

const colorPicker = ref(false);

const oldName = ref(""),
	teamName = ref(props.team?.name || ""),
	teamGithub = ref(props.team?.github || ""),
	teamColor = ref(props.team?.color || "#3081E0"),
	teamDescription = ref(props.team?.description || "");

const edit = computed(() => !!props.team);

watch(() => props.team, function (newTeam) {
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
	};

	if (edit.value) {
        const existingNotes = props.team?.stickyNotes || [];
		let data = await $fetch(`/api/team/edit/`, {
			method: "PUT",
			body: { 
                oldName: oldName.value, 
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