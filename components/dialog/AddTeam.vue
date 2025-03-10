<template>
	<form @submit.prevent="addTeam" class="fixed bg-white rounded-3xl w-[50%] h-[50%] p-[2%] flex justify-between flex-col">

		<div>
			<h1 class="text-left text-3xl font-bold">Add Team</h1>
		</div>

		<div class="flex flex-col">
			<div class="flex justify-between flex-row gap-4">
				<input v-model="teamName" required class="mb-4 p-3 border-2 h-[50px] border-black rounded-xl text-sm font-semibold w-full trans-all-linear" name="teamName" placeholder="Team Name">
				<input v-model="teamGithub" type="url" class="mb-4 p-3 border-2 h-[50px] border-black rounded-xl text-sm font-semibold w-full trans-all-linear" name="teamGithub" placeholder="GitHub URL">
				<div class="relative w-full">
					<button @click="colorPicker = !colorPicker" type="button" :style="{ backgroundColor: teamColor, borderColor: teamColor, color: 'white' }" :class="` text-white`" class="cursor-pointer mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear text-left">Color</button>
					<color-picker-block v-if="colorPicker" class="absolute left-0 top-full mt-2 z-50 shadow-lg bg-white p-2 rounded-lg" v-model="teamColor" immediate-emit with-eye-dropper with-hex-input with-rgb-input :with-colors-history="6" storage-key="teamcolors" />
					<div v-if="colorPicker" @click="colorPicker = !colorPicker" class="fixed inset-0 z-5 "></div>
				</div>

			</div>
			<div>
				<textarea v-model="teamDescription" class="mb-4 p-3 border-2 min-h-[50px] h-[100px] max-h-[190px] border-black rounded-xl text-sm font-semibold w-full trans-all-linear" name="teamDescription" placeholder="Team Description"></textarea>
			</div>
		</div>

		<div class="flex justify-between gap-70 flex-row">
			<button @click="emit('close')" class="cursor-pointer rounded-full bg-zinc-300 w-full h-[56px] text-xl font-bold text-black">
				Cancel
			</button>
			<button type="submit" class="cursor-pointer rounded-full bg-bluey-500 w-full h-[56px] text-xl font-bold text-white">
				Add
			</button>
		</div>
	</form>
</template>

<script setup>
import { ref } from "vue";

const emit = defineEmits(["close"]);

const colorPicker = ref(false);

const teamName = ref("");
const teamGithub = ref("");
const teamColor = ref("#3081E0");
const teamDescription = ref("");

const addTeam = () => {
	console.log("Formulář odeslán s daty:", {
		teamName: teamName.value,
		teamGithub: teamGithub.value,
		teamColor: teamColor.value,
		teamDescription: teamDescription.value
	});

	// Např. odeslání na API
	// await fetch("/api/teams", { method: "POST", body: JSON.stringify({ teamName, teamGithub, teamColor, teamDescription }) });
	emit('close');

	teamName.value = "";
	teamGithub.value = "";
	teamColor.value = "";
	teamDescription.value = "";
};
</script>