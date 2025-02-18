<template>
	<div class="font-sans flex min-h-screen bg-white dark:bg-gray-900 flex-col transition-colors duration-500">

		<div class="m-auto">
			<div class="p-6">
				<h1 class="font-extrabold text-bluey-500 text-9xl text-center">dashhack</h1>
				<h2 class="font-bold text-black text-6xl text-center dark:text-white transition-colors duration-500">Hackathon Monitoring</h2>
			</div>
			<div class="pt-10 flex items-center flex-col">
				<div class="flex gap-10">
					<input type="username" placeholder="Event Name" class="text-xl rounded-lg bg-zinc-300 w-72 h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4" />
					<input type="password" placeholder="Password" class="text-xl rounded-lg bg-zinc-300 w-72 h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4" />
				</div>
				<button class="text-xl font-bold mt-10 rounded-full bg-bluey-500 text-white rounded w-72 h-16 hover:bg-bluey-600 transition-colors duration-300">Open Dashboard</button>
			</div>
		</div>

		<footer class="pb-16 text-black text-center font-mono">
			<div class="flex gap-5 justify-center">
				<span @click.prevent="darkMode" class="cursor-pointer text-bluey-500 hover:text-bluey-600 dark:hover:text-bluey-400 dark:text-bluey-300 transition-colors duration-500">
					{{ colorMode.preference === "dark" ? "Light" : "Dark" }} Mode
				</span>
			</div>
			<div class="flex gap-5 justify-center underline">
				<a href="" class="hover:text-bluey-500 dark:hover:text-bluey-500 dark:text-white transition-colors duration-500">Privacy Policy</a>
				<a href="" class="hover:text-bluey-500 dark:hover:text-bluey-500 dark:text-white transition-colors duration-500">Terms of Use</a>
			</div>
			<div>
				<p class="dark:text-white transition-colors duration-500">&copy; 2025 ArimDev</p>
			</div>
		</footer>
	</div>
</template>

<script setup>
const colorMode = useColorMode();

function darkMode() {
	if (colorMode.preference === "dark") colorMode.preference = "light";
	else colorMode.preference = "dark";
}
</script>