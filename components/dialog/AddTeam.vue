<template>
	<div>
		<div @click="emit('close', false)" class="absolute inset-0 bg-black opacity-45"></div>
		<div class="relative inset-0 flex justify-center items-center z-[100]">
			<form @submit.prevent="teamSubmit" class="fixed bg-white text-black dark:bg-gray-800 dark:text-white rounded-3xl w-[50%] h-[50%] p-[2%] flex justify-between flex-col">
				<div>
					<h1 class="text-left text-3xl font-bold">{{ edit ? "Edit Team" : "Add Team" }}</h1>
				</div>

				<div class="flex flex-col">
					<div class="flex justify-between flex-row gap-4">
						<input v-model="teamName" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" name="teamName" placeholder="Team Name">
						<input v-model="teamGithub" type="url" class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" name="teamGithub" placeholder="GitHub URL">
						<div class="relative w-full">
							<button @click="colorPicker = !colorPicker" type="button" :style="{ backgroundColor: teamColor, borderColor: teamColor, color: 'white' }" class="cursor-pointer mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear text-left">Color</button>
							<color-picker-block v-if="!!colorPicker" class="absolute left-0 top-full mt-2 z-50 shadow-lg bg-white p-2 rounded-lg" v-model="teamColor" immediate-emit with-eye-dropper with-hex-input with-rgb-input :with-colors-history="6" storage-key="teamcolors" />
							<div v-if="!!colorPicker" @click="colorPicker = !colorPicker" class="fixed inset-0 z-5"></div>
						</div>
					</div>
					<div>
						<textarea v-model="teamDescription" class="mb-4 p-3 border-2 min-h-[50px] h-[100px] max-h-[190px] border-black dark:border-white rounded-xl text-sm font-semibold w-full trans-all-linear dark:placeholder-slate-300" name="teamDescription" placeholder="Team Description"></textarea>
					</div>
				</div>

				<div class="flex justify-between gap-70 flex-row">
					<button @click="emit('close', false)" class="cursor-pointer rounded-full bg-zinc-300 w-full h-[56px] text-xl font-bold text-black">
						Cancel
					</button>
					<button type="submit" class="cursor-pointer rounded-full bg-bluey-500 w-full h-[56px] text-xl font-bold text-white">
						{{ edit ? "Save Changes" : "Add Team" }}
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const emit = defineEmits(["close"]);
const props = defineProps({
	team: {
		type: [Object, Boolean],
		required: false
	},
});

const route = useRoute();
const eventName = route.params.event;

const colorPicker = ref(false);

const oldName = ref("");
const teamName = ref(props.team?.name || "");
const teamGithub = ref(props.team?.github || "");
const teamColor = ref(props.team?.color || "#3081E0");
const teamDescription = ref(props.team?.description || "");

const edit = computed(() => !!props.team);

watch(() => props.team, function (newTeam) {
	if (newTeam) {
		oldName.value = newTeam.name || "";
		teamName.value = newTeam.name || "";
		teamGithub.value = newTeam.github || "";
		teamColor.value = newTeam.color || "#3081E0";
		teamDescription.value = newTeam.description || "";
	} else {
		teamName.value = "";
		teamGithub.value = "";
		teamColor.value = "#3081E0";
		teamDescription.value = "";
	}
}, { immediate: true });

async function teamSubmit() {
	const teamData = {
		username: eventName,
		teamName: teamName.value,
		teamColor: teamColor.value,
		teamDescription: teamDescription.value,
		teamGithub: teamGithub.value,
	};

	if (edit.value) {
		let data = await $fetch(`/api/team/edit/`, {
			method: "PUT",
			body: { oldName: oldName.value, ...teamData }
		});

		if (!data || data.status !== 200) {
			console.log(data);

			// TODO: What's the error? TEAM API
		} else {
			emit('close', true);

			teamName.value = "";
			teamGithub.value = "";
			teamDescription.value = "";
		}
	} else {
		let data = await $fetch(`/api/team/add`, {
			method: "POST",
			body: teamData
		});

		if (!data || data.status !== 200) {
			console.log(data);

			// TODO: What's the error? TEAM API 
		} else {
			emit('close', true);

			teamName.value = "";
			teamGithub.value = "";
			teamDescription.value = "";
		};
	};
};
</script>